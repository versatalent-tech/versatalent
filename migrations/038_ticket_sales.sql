-- 038: Selling event tickets on the website (SumUp Hosted Checkout)
--
-- Ticket types per event, orders with the buyer's details (for follow-up and
-- analysis: Instagram is always asked), every SumUp payment page created for
-- an order, and loyalty points for members who buy.
--
-- ticket_order_create() locks the event's ticket types, checks what's left
-- (paid tickets plus unpaid orders still holding seats) and creates the order
-- in one step, so two buyers can't take the last ticket at the same moment.

BEGIN;

CREATE TABLE IF NOT EXISTS ticket_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  price_cents integer NOT NULL CHECK (price_cents >= 0),
  currency text NOT NULL DEFAULT 'GBP',
  capacity integer CHECK (capacity IS NULL OR capacity >= 0),   -- NULL = no limit
  max_per_order integer NOT NULL DEFAULT 6 CHECK (max_per_order BETWEEN 1 AND 50),
  sales_start timestamptz,
  sales_end timestamptz,                          -- NULL = until the event ends
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (sales_end IS NULL OR sales_start IS NULL OR sales_end > sales_start)
);
CREATE INDEX IF NOT EXISTS idx_ticket_types_event ON ticket_types (event_id, sort_order);

CREATE TABLE IF NOT EXISTS ticket_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference text NOT NULL UNIQUE,                 -- shown to the buyer and on the door list
  access_token text NOT NULL,                     -- lets the buyer reopen their order page
  event_id uuid REFERENCES events(id) ON DELETE SET NULL,
  event_title text NOT NULL,                      -- kept if the event is deleted
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'paid', 'payment_failed', 'expired', 'refunded', 'cancelled')),
  quantity integer NOT NULL CHECK (quantity > 0),
  total_cents integer NOT NULL CHECK (total_cents >= 0),
  currency text NOT NULL DEFAULT 'GBP',
  hold_until timestamptz NOT NULL,                -- unpaid orders keep their tickets until then

  -- Buyer
  first_name text NOT NULL,
  last_name text NOT NULL,
  email text NOT NULL,
  phone text,
  instagram text NOT NULL,                        -- handle without the @
  city text,
  age_range text CHECK (age_range IS NULL OR age_range IN ('18-24', '25-34', '35-44', '45-54', '55+')),
  heard_from text,
  marketing_consent boolean NOT NULL DEFAULT false,
  terms_accepted_at timestamptz NOT NULL,

  -- Where the sale came from
  source text NOT NULL DEFAULT 'website',
  utm_source text,
  utm_medium text,
  utm_campaign text,
  referrer text,

  -- Payment, points, refunds
  sumup_checkout_id text,
  payment_attempts integer NOT NULL DEFAULT 0,
  paid_at timestamptz,
  transaction_code text,
  member_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  points_awarded integer NOT NULL DEFAULT 0,
  refunded_at timestamptz,
  refunded_by uuid REFERENCES users(id) ON DELETE SET NULL,
  refund_reason text,
  arrived_at timestamptz,                         -- ticked off on the door list
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ticket_orders_event ON ticket_orders (event_id, status);
CREATE INDEX IF NOT EXISTS idx_ticket_orders_email ON ticket_orders (lower(email));
CREATE INDEX IF NOT EXISTS idx_ticket_orders_instagram ON ticket_orders (lower(instagram));
CREATE INDEX IF NOT EXISTS idx_ticket_orders_created ON ticket_orders (created_at DESC);

CREATE TABLE IF NOT EXISTS ticket_order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES ticket_orders(id) ON DELETE CASCADE,
  ticket_type_id uuid REFERENCES ticket_types(id) ON DELETE SET NULL,
  name text NOT NULL,
  unit_price_cents integer NOT NULL CHECK (unit_price_cents >= 0),
  quantity integer NOT NULL CHECK (quantity > 0)
);
CREATE INDEX IF NOT EXISTS idx_ticket_order_items_order ON ticket_order_items (order_id);
CREATE INDEX IF NOT EXISTS idx_ticket_order_items_type ON ticket_order_items (ticket_type_id);

-- Every SumUp payment page created for an order
CREATE TABLE IF NOT EXISTS ticket_order_checkouts (
  checkout_id text PRIMARY KEY,
  order_id uuid NOT NULL REFERENCES ticket_orders(id) ON DELETE CASCADE,
  reference text NOT NULL UNIQUE,
  amount_cents integer NOT NULL,
  currency text NOT NULL,
  outcome text NOT NULL DEFAULT 'pending' CHECK (outcome IN ('pending', 'paid', 'failed', 'expired')),
  transaction_code text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ticket_order_checkouts_order ON ticket_order_checkouts (order_id);

-- Points for ticket purchases (points per £1; same default as the till)
INSERT INTO vip_point_rules (action_type, points_per_unit, unit, is_active)
SELECT 'ticket_purchase', COALESCE((SELECT points_per_unit FROM vip_point_rules WHERE action_type = 'consumption'), 1.0 / 3), 'GBP', TRUE
ON CONFLICT (action_type) DO NOTHING;

ALTER TABLE vip_points_log DROP CONSTRAINT IF EXISTS vip_points_log_source_check;
ALTER TABLE vip_points_log ADD CONSTRAINT vip_points_log_source_check CHECK (source IN (
  'event_checkin', 'consumption', 'consumption_pos', 'manual_adjust', 'tier_bonus',
  'opening_balance', 'reward_claim', 'reward_release', 'order_refund', 'year_end',
  'ticket_purchase'
));

-- ---------------------------------------------------------------------------
-- ticket_order_create: p_items = [{"ticket_type_id": "...", "quantity": 2}, ...]
-- p_buyer = the buyer and tracking fields. Returns the new order's id, or
-- raises P0001 with a message for the buyer.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION ticket_order_create(
  p_event uuid, p_items jsonb, p_buyer jsonb, p_reference text, p_token text, p_hold_minutes integer
) RETURNS uuid
LANGUAGE plpgsql AS $$
DECLARE
  ev events%ROWTYPE;
  item jsonb;
  tt ticket_types%ROWTYPE;
  qty integer;
  taken integer;
  total integer := 0;
  count_all integer := 0;
  order_currency text := NULL;
  new_id uuid;
BEGIN
  SELECT * INTO ev FROM events WHERE id = p_event;
  IF NOT FOUND OR ev.status IN ('cancelled', 'completed') OR COALESCE(ev.is_published, true) = false THEN
    RAISE EXCEPTION 'Tickets for this event aren''t on sale' USING ERRCODE = 'P0001';
  END IF;
  IF jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'Choose at least one ticket' USING ERRCODE = 'P0001';
  END IF;

  -- Lock this event's ticket types in a fixed order so concurrent buyers queue
  PERFORM 1 FROM ticket_types WHERE event_id = p_event ORDER BY id FOR UPDATE;

  FOR item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    qty := (item->>'quantity')::integer;
    SELECT * INTO tt FROM ticket_types WHERE id = (item->>'ticket_type_id')::uuid AND event_id = p_event;
    IF NOT FOUND OR NOT tt.is_active
       OR (tt.sales_start IS NOT NULL AND tt.sales_start > now())
       OR COALESCE(tt.sales_end, ev.end_time, ev.start_time) <= now() THEN
      RAISE EXCEPTION 'One of these tickets is no longer on sale' USING ERRCODE = 'P0001';
    END IF;
    IF qty < 1 OR qty > tt.max_per_order THEN
      RAISE EXCEPTION 'You can buy up to % "%" tickets per order', tt.max_per_order, tt.name USING ERRCODE = 'P0001';
    END IF;
    IF order_currency IS NOT NULL AND order_currency <> tt.currency THEN
      RAISE EXCEPTION 'These tickets can''t be bought together' USING ERRCODE = 'P0001';
    END IF;
    order_currency := tt.currency;

    IF tt.capacity IS NOT NULL THEN
      SELECT COALESCE(SUM(i.quantity), 0) INTO taken
      FROM ticket_order_items i JOIN ticket_orders o ON o.id = i.order_id
      WHERE i.ticket_type_id = tt.id
        AND (o.status = 'paid' OR (o.status IN ('pending', 'payment_failed') AND o.hold_until > now()));
      IF taken + qty > tt.capacity THEN
        IF tt.capacity - taken <= 0 THEN
          RAISE EXCEPTION '"%" is sold out', tt.name USING ERRCODE = 'P0001';
        END IF;
        RAISE EXCEPTION 'Only % "%" %', tt.capacity - taken, tt.name,
          CASE WHEN tt.capacity - taken = 1 THEN 'ticket left' ELSE 'tickets left' END USING ERRCODE = 'P0001';
      END IF;
    END IF;

    total := total + tt.price_cents * qty;
    count_all := count_all + qty;
  END LOOP;

  INSERT INTO ticket_orders (
    reference, access_token, event_id, event_title, status, quantity, total_cents, currency, hold_until,
    first_name, last_name, email, phone, instagram, city, age_range, heard_from, marketing_consent, terms_accepted_at,
    source, utm_source, utm_medium, utm_campaign, referrer
  ) VALUES (
    p_reference, p_token, p_event, ev.title, 'pending', count_all, total, order_currency,
    now() + make_interval(mins => p_hold_minutes),
    p_buyer->>'first_name', p_buyer->>'last_name', lower(p_buyer->>'email'), p_buyer->>'phone', p_buyer->>'instagram',
    p_buyer->>'city', p_buyer->>'age_range', p_buyer->>'heard_from', COALESCE((p_buyer->>'marketing_consent')::boolean, false), now(),
    COALESCE(p_buyer->>'source', 'website'), p_buyer->>'utm_source', p_buyer->>'utm_medium', p_buyer->>'utm_campaign', p_buyer->>'referrer'
  ) RETURNING id INTO new_id;

  INSERT INTO ticket_order_items (order_id, ticket_type_id, name, unit_price_cents, quantity)
  SELECT new_id, t.id, t.name, t.price_cents, (x->>'quantity')::integer
  FROM jsonb_array_elements(p_items) x JOIN ticket_types t ON t.id = (x->>'ticket_type_id')::uuid;

  RETURN new_id;
END;
$$;

COMMIT;
