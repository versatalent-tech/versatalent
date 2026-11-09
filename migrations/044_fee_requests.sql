-- 044: managers' fee and commission changes wait for an admin's approval
--
-- Managers now earn a share of the agency's commission (043), so their changes
-- to a booking's fee, commission % or currency are saved here as a request and
-- only applied to the booking when an admin approves. One pending request per
-- booking; same status names as talent_profile_changes (027).

BEGIN;

CREATE TABLE IF NOT EXISTS booking_fee_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  requested_by uuid REFERENCES users(id) ON DELETE SET NULL,
  fee_cents integer CHECK (fee_cents IS NULL OR fee_cents >= 0),
  commission_percent numeric(5,2) CHECK (commission_percent IS NULL OR (commission_percent >= 0 AND commission_percent <= 100)),
  currency text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'withdrawn')),
  decided_by uuid REFERENCES users(id) ON DELETE SET NULL,
  decided_at timestamptz,
  decision_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
-- At most one pending request per booking
CREATE UNIQUE INDEX IF NOT EXISTS idx_fee_requests_one_pending ON booking_fee_requests (booking_id) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_fee_requests_status ON booking_fee_requests (status, created_at DESC);

COMMIT;
