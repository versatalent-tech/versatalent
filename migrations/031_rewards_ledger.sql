-- 031: two points balances (status and reward), rewards with claims, till refunds
--
-- Status points (vip_memberships.status_points) decide the tier. Reward
-- points (vip_memberships.points_balance, the balance members already see)
-- are what they spend. Every change to either goes through loyalty_post(),
-- which locks the member, refuses duplicate source keys, updates the
-- balance and writes the ledger entry in one step. Balances always equal
-- the sum of their ledger entries from launch.

BEGIN;

INSERT INTO programme_settings (key, value) VALUES
  ('rewards_open', 'false'),          -- members and staff can claim rewards
  ('reward_earn_percent', '100')      -- reward points earned as a % of status points
ON CONFLICT (key) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Ledger: vip_points_log gains a ledger and a unique source key.
-- Entries from before this migration are kept as 'legacy' history.
-- ---------------------------------------------------------------------------
ALTER TABLE vip_points_log ADD COLUMN IF NOT EXISTS ledger text NOT NULL DEFAULT 'legacy';
ALTER TABLE vip_points_log DROP CONSTRAINT IF EXISTS vip_points_log_ledger_check;
ALTER TABLE vip_points_log ADD CONSTRAINT vip_points_log_ledger_check CHECK (ledger IN ('legacy', 'status', 'reward'));
ALTER TABLE vip_points_log ADD COLUMN IF NOT EXISTS source_key text;
ALTER TABLE vip_points_log ADD COLUMN IF NOT EXISTS actor_id uuid REFERENCES users(id) ON DELETE SET NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_vip_points_log_source_key ON vip_points_log (ledger, source_key) WHERE source_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_vip_points_log_user_ledger ON vip_points_log (user_id, ledger, created_at DESC);

ALTER TABLE vip_points_log DROP CONSTRAINT IF EXISTS vip_points_log_source_check;
ALTER TABLE vip_points_log ADD CONSTRAINT vip_points_log_source_check CHECK (source IN (
  'event_checkin', 'consumption', 'consumption_pos', 'manual_adjust', 'tier_bonus',
  'opening_balance', 'reward_claim', 'reward_release', 'order_refund', 'year_end'
));

-- Opening balances: today's balances become each ledger's first entry
INSERT INTO vip_points_log (user_id, ledger, source, source_key, delta_points, balance_after, metadata)
SELECT user_id, 'reward', 'opening_balance', 'opening:' || user_id, points_balance, points_balance,
       jsonb_build_object('note', 'Balance carried over when reward points started')
FROM vip_memberships
ON CONFLICT (ledger, source_key) WHERE source_key IS NOT NULL DO NOTHING;

INSERT INTO vip_points_log (user_id, ledger, source, source_key, delta_points, balance_after, metadata)
SELECT user_id, 'status', 'opening_balance', 'opening:' || user_id, status_points, status_points,
       jsonb_build_object('note', 'Status points for the current membership year when the ledger started')
FROM vip_memberships
ON CONFLICT (ledger, source_key) WHERE source_key IS NOT NULL DO NOTHING;

-- ---------------------------------------------------------------------------
-- loyalty_post: the only way balances change.
--   p_mode 'strict': refuse if the balance would go below zero
--          'clamp':  take at most what's there (records what was applied)
--          'reset':  bring the balance to zero (year end)
-- A repeated source key returns the original entry (duplicate = true).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION loyalty_post(
  p_user uuid, p_ledger text, p_delta integer, p_source text, p_source_key text,
  p_ref uuid, p_metadata jsonb, p_actor uuid, p_mode text
) RETURNS TABLE (out_id uuid, out_applied integer, out_balance integer, out_duplicate boolean)
LANGUAGE plpgsql AS $$
DECLARE
  m vip_memberships%ROWTYPE;
  prior vip_points_log%ROWTYPE;
  cur integer;
  amt integer;
  new_id uuid;
BEGIN
  IF p_ledger NOT IN ('status', 'reward') THEN
    RAISE EXCEPTION 'Unknown ledger %', p_ledger;
  END IF;

  SELECT * INTO m FROM vip_memberships WHERE user_id = p_user FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'No membership for this member' USING ERRCODE = 'P0002';
  END IF;

  IF p_source_key IS NOT NULL THEN
    SELECT * INTO prior FROM vip_points_log WHERE ledger = p_ledger AND source_key = p_source_key;
    IF FOUND THEN
      RETURN QUERY SELECT prior.id, prior.delta_points, prior.balance_after, true;
      RETURN;
    END IF;
  END IF;

  cur := CASE WHEN p_ledger = 'reward' THEN m.points_balance ELSE m.status_points END;
  amt := CASE WHEN p_mode = 'reset' THEN -cur ELSE p_delta END;
  IF cur + amt < 0 THEN
    IF p_mode = 'strict' THEN
      RAISE EXCEPTION 'Not enough points: % available', cur USING ERRCODE = 'P0001';
    END IF;
    amt := -cur;
  END IF;

  IF p_ledger = 'reward' THEN
    UPDATE vip_memberships SET points_balance = cur + amt, updated_at = NOW() WHERE id = m.id;
  ELSE
    UPDATE vip_memberships
    SET status_points = cur + amt,
        lifetime_points = lifetime_points + CASE WHEN p_source IN ('opening_balance', 'year_end') THEN 0 ELSE GREATEST(amt, 0) END,
        updated_at = NOW()
    WHERE id = m.id;
  END IF;

  INSERT INTO vip_points_log (user_id, ledger, source, source_key, ref_id, delta_points, balance_after, metadata, actor_id)
  VALUES (
    p_user, p_ledger, p_source, p_source_key, p_ref, amt, cur + amt,
    COALESCE(p_metadata, '{}'::jsonb) || CASE WHEN amt <> p_delta AND p_mode = 'clamp'
      THEN jsonb_build_object('requested', p_delta) ELSE '{}'::jsonb END,
    p_actor
  )
  RETURNING id INTO new_id;

  RETURN QUERY SELECT new_id, amt, cur + amt, false;
END;
$$;

-- Move a membership into its next year: secured tier, status points back to
-- zero (as a ledger entry). Safe to call twice.
CREATE OR REPLACE FUNCTION loyalty_start_year(p_user uuid, p_prev date, p_years integer, p_tier text)
RETURNS boolean
LANGUAGE plpgsql AS $$
BEGIN
  UPDATE vip_memberships
  SET year_start = (year_start + make_interval(years => p_years))::date, base_tier = p_tier, tier = p_tier
  WHERE user_id = p_user AND year_start = p_prev;
  IF NOT FOUND THEN
    RETURN false;
  END IF;
  PERFORM loyalty_post(p_user, 'status', 0, 'year_end', 'year_end:' || p_user || ':' || p_prev, NULL,
                       jsonb_build_object('year_started', p_prev), NULL, 'reset');
  RETURN true;
END;
$$;

-- ---------------------------------------------------------------------------
-- Rewards and claims
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS rewards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  kind text NOT NULL DEFAULT 'other' CHECK (kind IN ('drink', 'upgrade', 'guest_pass', 'other')),
  point_cost integer NOT NULL DEFAULT 0 CHECK (point_cost >= 0),
  unit_cost_cents integer CHECK (unit_cost_cents IS NULL OR unit_cost_cents >= 0), -- what it costs us
  stock integer CHECK (stock IS NULL OR stock >= 0),                                -- total claims allowed
  per_member_limit integer CHECK (per_member_limit IS NULL OR per_member_limit > 0),
  limit_period text NOT NULL DEFAULT 'ever' CHECK (limit_period IN ('ever', 'year')),
  requires_event boolean NOT NULL DEFAULT false,
  event_ids uuid[],                                                                 -- null = any upcoming event
  per_event_cap integer CHECK (per_event_cap IS NULL OR per_event_cap > 0),
  book_hours_before integer NOT NULL DEFAULT 0 CHECK (book_hours_before >= 0),
  needs_guest_name boolean NOT NULL DEFAULT false,
  min_tier text CHECK (min_tier IS NULL OR min_tier IN ('silver', 'gold', 'black')),
  founding_only boolean NOT NULL DEFAULT false,
  birthday_month_only boolean NOT NULL DEFAULT false,
  claim_valid_days integer NOT NULL DEFAULT 30 CHECK (claim_valid_days > 0),
  valid_from date,
  valid_until date,
  is_active boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  updated_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS reward_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reward_id uuid NOT NULL REFERENCES rewards(id) ON DELETE RESTRICT,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'reserved' CHECK (status IN ('reserved', 'redeemed', 'cancelled', 'expired')),
  code text NOT NULL UNIQUE,
  reward_title text NOT NULL,
  points_held integer NOT NULL DEFAULT 0 CHECK (points_held >= 0),
  unit_cost_cents integer,
  event_id uuid REFERENCES events(id) ON DELETE SET NULL,
  guest_name text,
  expires_at timestamptz NOT NULL,
  redeemed_at timestamptz,
  redeemed_by uuid REFERENCES users(id) ON DELETE SET NULL,
  closed_at timestamptz,
  closed_by uuid REFERENCES users(id) ON DELETE SET NULL,
  close_reason text,
  created_by uuid REFERENCES users(id) ON DELETE SET NULL, -- staff who claimed for the member; null = the member
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_reward_claims_reward ON reward_claims (reward_id, status);
CREATE INDEX IF NOT EXISTS idx_reward_claims_user ON reward_claims (user_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reward_claims_event ON reward_claims (event_id) WHERE event_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_reward_claims_expiry ON reward_claims (expires_at) WHERE status = 'reserved';

-- Claim a reward: every rule is checked and the points are taken in one step.
-- Errors (P0001) are written for the member to read.
CREATE OR REPLACE FUNCTION reward_claim(
  p_reward uuid, p_user uuid, p_event uuid, p_guest_name text, p_code text, p_actor uuid, p_redeem_now boolean
) RETURNS uuid
LANGUAGE plpgsql AS $$
DECLARE
  r rewards%ROWTYPE;
  m vip_memberships%ROWTYPE;
  ev record;
  claim_id uuid := gen_random_uuid();
  uk_today date := (NOW() AT TIME ZONE 'Europe/London')::date;
  founding_start timestamptz;
  dob date;
  since timestamptz;
  used integer;
  expires timestamptz;
  tier_rank integer;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM programme_settings WHERE key = 'rewards_open' AND value = 'true'::jsonb) THEN
    RAISE EXCEPTION 'Rewards aren''t open at the moment.' USING ERRCODE = 'P0001';
  END IF;

  SELECT * INTO r FROM rewards WHERE id = p_reward FOR UPDATE;
  IF NOT FOUND OR NOT r.is_active OR (r.valid_from IS NOT NULL AND uk_today < r.valid_from)
     OR (r.valid_until IS NOT NULL AND uk_today > r.valid_until) THEN
    RAISE EXCEPTION 'This reward isn''t available.' USING ERRCODE = 'P0001';
  END IF;

  SELECT * INTO m FROM vip_memberships WHERE user_id = p_user;
  IF NOT FOUND OR m.status <> 'active' THEN
    RAISE EXCEPTION 'You need an active membership to claim rewards.' USING ERRCODE = 'P0001';
  END IF;

  IF r.min_tier IS NOT NULL THEN
    -- (CASE can't sit inside an IF condition in PL/pgSQL: its THEN ends the condition)
    tier_rank := array_position(ARRAY['silver', 'gold', 'black'], m.tier);
    IF tier_rank < array_position(ARRAY['silver', 'gold', 'black'], r.min_tier) THEN
      RAISE EXCEPTION 'This reward is for % members and above.', initcap(r.min_tier) USING ERRCODE = 'P0001';
    END IF;
  END IF;

  SELECT starts_at INTO founding_start FROM paid_memberships
  WHERE user_id = p_user AND status = 'active' AND starts_at <= NOW() AND ends_at > NOW()
  ORDER BY starts_at DESC LIMIT 1;
  IF r.founding_only AND founding_start IS NULL THEN
    RAISE EXCEPTION 'This reward is for V•PRIVILEGE Founding Members.' USING ERRCODE = 'P0001';
  END IF;

  IF r.birthday_month_only THEN
    SELECT date_of_birth INTO dob FROM vip_profiles WHERE user_id = p_user;
    IF dob IS NULL OR EXTRACT(MONTH FROM dob) <> EXTRACT(MONTH FROM uk_today) THEN
      RAISE EXCEPTION 'This reward is available in your birthday month.' USING ERRCODE = 'P0001';
    END IF;
  END IF;

  IF r.stock IS NOT NULL THEN
    SELECT COUNT(*) INTO used FROM reward_claims WHERE reward_id = r.id AND status IN ('reserved', 'redeemed');
    IF used >= r.stock THEN
      RAISE EXCEPTION 'This reward has run out.' USING ERRCODE = 'P0001';
    END IF;
  END IF;

  IF r.per_member_limit IS NOT NULL THEN
    since := CASE
      WHEN r.limit_period = 'ever' THEN '-infinity'::timestamptz
      WHEN r.founding_only THEN founding_start
      ELSE (m.year_start::timestamp AT TIME ZONE 'Europe/London')
    END;
    SELECT COUNT(*) INTO used FROM reward_claims
    WHERE reward_id = r.id AND user_id = p_user AND status IN ('reserved', 'redeemed') AND created_at >= since;
    IF used >= r.per_member_limit THEN
      RAISE EXCEPTION 'You''ve already claimed this reward%.',
        CASE WHEN r.limit_period = 'year' THEN ' as many times as you can this year' ELSE '' END USING ERRCODE = 'P0001';
    END IF;
  END IF;

  IF r.requires_event THEN
    IF p_event IS NULL THEN
      RAISE EXCEPTION 'Choose the event.' USING ERRCODE = 'P0001';
    END IF;
    SELECT id, title, start_time INTO ev FROM events WHERE id = p_event AND COALESCE(is_published, true);
    IF NOT FOUND OR ev.start_time < NOW() - INTERVAL '12 hours' THEN
      RAISE EXCEPTION 'That event isn''t available.' USING ERRCODE = 'P0001';
    END IF;
    IF r.event_ids IS NOT NULL AND NOT (p_event = ANY (r.event_ids)) THEN
      RAISE EXCEPTION 'This reward can''t be used at that event.' USING ERRCODE = 'P0001';
    END IF;
    IF r.book_hours_before > 0 AND ev.start_time - NOW() < make_interval(hours => r.book_hours_before) THEN
      RAISE EXCEPTION 'Claim this at least % hours before the event.', r.book_hours_before USING ERRCODE = 'P0001';
    END IF;
    SELECT COUNT(*) INTO used FROM reward_claims
    WHERE reward_id = r.id AND event_id = p_event AND user_id = p_user AND status IN ('reserved', 'redeemed');
    IF used > 0 THEN
      RAISE EXCEPTION 'You''ve already claimed this for that event.' USING ERRCODE = 'P0001';
    END IF;
    IF r.per_event_cap IS NOT NULL THEN
      SELECT COUNT(*) INTO used FROM reward_claims WHERE reward_id = r.id AND event_id = p_event AND status IN ('reserved', 'redeemed');
      IF used >= r.per_event_cap THEN
        RAISE EXCEPTION 'No places left for that event.' USING ERRCODE = 'P0001';
      END IF;
    END IF;
    expires := ev.start_time + INTERVAL '1 day';
  ELSE
    expires := NOW() + make_interval(days => r.claim_valid_days);
  END IF;

  IF r.needs_guest_name AND COALESCE(btrim(p_guest_name), '') = '' THEN
    RAISE EXCEPTION 'Enter your guest''s name.' USING ERRCODE = 'P0001';
  END IF;

  IF r.point_cost > 0 THEN
    IF m.points_balance < r.point_cost THEN
      RAISE EXCEPTION 'You need % points for this (you have %).', r.point_cost, m.points_balance USING ERRCODE = 'P0001';
    END IF;
    PERFORM loyalty_post(p_user, 'reward', -r.point_cost, 'reward_claim', 'claim:' || claim_id, claim_id,
                         jsonb_build_object('reward', r.title), p_actor, 'strict');
  END IF;

  INSERT INTO reward_claims (id, reward_id, user_id, status, code, reward_title, points_held, unit_cost_cents,
                             event_id, guest_name, expires_at, redeemed_at, redeemed_by, created_by)
  VALUES (claim_id, r.id, p_user, CASE WHEN p_redeem_now THEN 'redeemed' ELSE 'reserved' END, p_code, r.title,
          r.point_cost, r.unit_cost_cents, CASE WHEN r.requires_event THEN p_event END,
          CASE WHEN r.needs_guest_name THEN btrim(p_guest_name) END, expires,
          CASE WHEN p_redeem_now THEN NOW() END, CASE WHEN p_redeem_now THEN p_actor END, p_actor);
  RETURN claim_id;
END;
$$;

-- Close a reserved claim: redeemed (used), cancelled or expired. Cancelled and
-- expired claims give the points back. Returns the claim's new status.
CREATE OR REPLACE FUNCTION reward_claim_close(p_claim uuid, p_status text, p_actor uuid, p_reason text)
RETURNS text
LANGUAGE plpgsql AS $$
DECLARE
  c reward_claims%ROWTYPE;
  ev_start timestamptz;
  ev_title text;
  final text := p_status;
BEGIN
  IF p_status NOT IN ('redeemed', 'cancelled', 'expired') THEN
    RAISE EXCEPTION 'Unknown status %', p_status;
  END IF;

  SELECT * INTO c FROM reward_claims WHERE id = p_claim FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Claim not found.' USING ERRCODE = 'P0001';
  END IF;
  IF c.status = 'redeemed' THEN
    RAISE EXCEPTION 'Already used on %.', to_char(c.redeemed_at AT TIME ZONE 'Europe/London', 'FMDD Mon YYYY "at" HH24:MI') USING ERRCODE = 'P0001';
  ELSIF c.status = 'cancelled' THEN
    RAISE EXCEPTION 'This claim was cancelled.' USING ERRCODE = 'P0001';
  ELSIF c.status = 'expired' THEN
    RAISE EXCEPTION 'This claim has expired.' USING ERRCODE = 'P0001';
  END IF;

  IF p_status = 'redeemed' THEN
    IF c.expires_at <= NOW() THEN
      final := 'expired';
    ELSIF c.event_id IS NOT NULL THEN
      SELECT start_time, title INTO ev_start, ev_title FROM events WHERE id = c.event_id;
      IF ev_start IS NOT NULL AND ev_start - INTERVAL '12 hours' > NOW() THEN
        RAISE EXCEPTION 'This is for % on %. It can be used on the day.', ev_title,
          to_char(ev_start AT TIME ZONE 'Europe/London', 'FMDD Mon') USING ERRCODE = 'P0001';
      END IF;
    END IF;
  END IF;

  IF final = 'redeemed' THEN
    UPDATE reward_claims SET status = 'redeemed', redeemed_at = NOW(), redeemed_by = p_actor, updated_at = NOW() WHERE id = c.id;
  ELSE
    UPDATE reward_claims
    SET status = final, closed_at = NOW(), closed_by = p_actor,
        close_reason = COALESCE(p_reason, CASE WHEN final = 'expired' THEN 'Not used in time' END), updated_at = NOW()
    WHERE id = c.id;
    IF c.points_held > 0 THEN
      PERFORM loyalty_post(c.user_id, 'reward', c.points_held, 'reward_release', 'claim_release:' || c.id, c.id,
                           jsonb_build_object('reward', c.reward_title, 'reason', final), p_actor, 'clamp');
    END IF;
  END IF;
  RETURN final;
END;
$$;

CREATE OR REPLACE FUNCTION reward_expire_claims() RETURNS integer
LANGUAGE plpgsql AS $$
DECLARE
  c record;
  n integer := 0;
BEGIN
  FOR c IN SELECT id FROM reward_claims WHERE status = 'reserved' AND expires_at <= NOW() ORDER BY expires_at LIMIT 500 LOOP
    PERFORM reward_claim_close(c.id, 'expired', NULL, NULL);
    n := n + 1;
  END LOOP;
  RETURN n;
END;
$$;

-- ---------------------------------------------------------------------------
-- Till refunds
-- ---------------------------------------------------------------------------
ALTER TABLE pos_orders DROP CONSTRAINT IF EXISTS pos_orders_status_check;
ALTER TABLE pos_orders ADD CONSTRAINT pos_orders_status_check CHECK (status IN ('pending', 'paid', 'cancelled', 'failed', 'refunded'));
ALTER TABLE pos_orders ADD COLUMN IF NOT EXISTS refunded_at timestamptz;
ALTER TABLE pos_orders ADD COLUMN IF NOT EXISTS refunded_by uuid REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE pos_orders ADD COLUMN IF NOT EXISTS refund_reason text;

ALTER TABLE vip_consumptions ADD COLUMN IF NOT EXISTS order_id uuid REFERENCES pos_orders(id) ON DELETE SET NULL;
ALTER TABLE vip_consumptions ADD COLUMN IF NOT EXISTS refunded_at timestamptz;

-- ---------------------------------------------------------------------------
-- Launch rewards (all off; set point costs and switch them on in the admin)
-- ---------------------------------------------------------------------------
INSERT INTO rewards (title, description, kind, point_cost, unit_cost_cents, stock, per_member_limit, limit_period,
                     requires_event, per_event_cap, book_hours_before, needs_guest_name, founding_only,
                     birthday_month_only, claim_valid_days, sort_order)
SELECT * FROM (VALUES
  ('Selected drink', 'A drink from the selected drinks list at the bar.', 'drink', 100, 150, NULL::integer, NULL::integer, 'ever',
   false, NULL::integer, 0, false, false, false, 30, 10),
  ('Ticket upgrade', 'Upgrade your ticket at the door (e.g. to VIP area access).', 'upgrade', 150, NULL, NULL, NULL, 'ever',
   true, 10, 0, false, false, false, 30, 20),
  ('Guest pass', 'Bring a friend: one guest entry for an event. Your guest must be 18+.', 'guest_pass', 200, 200, NULL, NULL, 'ever',
   true, 10, 24, true, false, false, 30, 30),
  ('Founding welcome drink', 'Your V•PRIVILEGE welcome drink from the selected list.', 'drink', 0, 150, NULL, 1, 'ever',
   false, NULL, 0, false, true, false, 90, 40),
  ('Founding birthday drink', 'A drink on us in your birthday month.', 'drink', 0, 150, NULL, 1, 'year',
   false, NULL, 0, false, true, true, 30, 50),
  ('Founding guest pass', 'One of your two V•PRIVILEGE guest passes this membership year. Guest must be 18+.', 'guest_pass', 0, 200, NULL, 2, 'year',
   true, NULL, 24, true, true, false, 30, 60)
) AS seed(title, description, kind, point_cost, unit_cost_cents, stock, per_member_limit, limit_period, requires_event,
          per_event_cap, book_hours_before, needs_guest_name, founding_only, birthday_month_only, claim_valid_days, sort_order)
WHERE NOT EXISTS (SELECT 1 FROM rewards);

COMMIT;
