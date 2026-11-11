-- 045: one ticket (with its own QR code) per person, and letting them in at the door
--
-- A paid order gets a row per ticket the first time its PDF is made or one of
-- its tickets is admitted. The QR holds the ticket's random code; a ticket is
-- admitted once, by QR, VIP card or by hand. ticket_orders.arrived_at stays as
-- "someone from this order is in" for the existing door list and reports.

BEGIN;

CREATE TABLE IF NOT EXISTS tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES ticket_orders(id) ON DELETE CASCADE,
  number integer NOT NULL CHECK (number > 0),
  ticket_type_name text NOT NULL,
  code text NOT NULL UNIQUE,
  admitted_at timestamptz,
  admitted_by uuid REFERENCES users(id) ON DELETE SET NULL,
  admitted_by_name text,
  admitted_via text CHECK (admitted_via IS NULL OR admitted_via IN ('qr', 'card', 'manual')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (order_id, number)
);

ALTER TABLE ticket_orders ADD COLUMN IF NOT EXISTS pdf_key text;
ALTER TABLE ticket_orders ADD COLUMN IF NOT EXISTS pdf_created_at timestamptz;

COMMIT;
