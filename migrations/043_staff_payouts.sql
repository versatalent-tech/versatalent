-- 043: managers' and road managers' share of the agency's commission
--
-- Each manager and road manager can have a rate (% of the agency's commission).
-- A booking gets one share per person looking after its talent when it's
-- created, with their rate copied, so later rate changes don't rewrite it.
-- The amount paid is stored, like talent payouts (028).

BEGIN;

ALTER TABLE users ADD COLUMN IF NOT EXISTS share_percent numeric(5,2)
  CHECK (share_percent IS NULL OR (share_percent >= 0 AND share_percent <= 100));

CREATE TABLE IF NOT EXISTS booking_staff_shares (
  booking_id uuid NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  share_percent numeric(5,2) NOT NULL CHECK (share_percent >= 0 AND share_percent <= 100),
  created_at timestamptz NOT NULL DEFAULT now(),
  paid_at timestamptz,
  paid_cents integer CHECK (paid_cents IS NULL OR paid_cents >= 0),
  paid_reference text,
  paid_by uuid REFERENCES users(id) ON DELETE SET NULL,
  PRIMARY KEY (booking_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_staff_shares_user ON booking_staff_shares (user_id);
CREATE INDEX IF NOT EXISTS idx_staff_shares_unpaid ON booking_staff_shares (user_id) WHERE paid_at IS NULL;

COMMIT;
