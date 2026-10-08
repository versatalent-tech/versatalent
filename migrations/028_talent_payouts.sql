-- 028: record when each booking's net pay was paid to the talent
--
-- A booking is "owed" once it has finished (confirmed or completed, with a fee)
-- and has no payment recorded. The amount paid is stored, so later edits to
-- the fee or commission don't rewrite what was actually paid.

BEGIN;

ALTER TABLE bookings ADD COLUMN IF NOT EXISTS talent_paid_at timestamptz;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS talent_paid_cents integer CHECK (talent_paid_cents IS NULL OR talent_paid_cents >= 0);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS talent_paid_reference text;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS talent_paid_by uuid REFERENCES users(id) ON DELETE SET NULL;

-- Finding unpaid finished work quickly
CREATE INDEX IF NOT EXISTS idx_bookings_unpaid ON bookings (talent_id, ends_at)
  WHERE talent_paid_at IS NULL AND status IN ('confirmed', 'completed') AND fee_cents IS NOT NULL;

COMMIT;
