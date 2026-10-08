-- 026: bookings, talent availability, per-talent commission, personal calendar feeds
--
-- Agreed rules:
-- - commission is set per talent; each booking copies the rate when created
-- - talents only ever see their net (fee minus commission)
-- - whether the talent sees the client's name is decided per booking

BEGIN;

ALTER TABLE talents ADD COLUMN IF NOT EXISTS commission_percent numeric(5,2)
  CHECK (commission_percent IS NULL OR (commission_percent >= 0 AND commission_percent <= 100));

CREATE TABLE IF NOT EXISTS bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  talent_id uuid NOT NULL REFERENCES talents(id) ON DELETE CASCADE,
  deal_id uuid REFERENCES deals(id) ON DELETE SET NULL,
  organisation_id uuid REFERENCES organisations(id) ON DELETE SET NULL,
  event_id uuid REFERENCES events(id) ON DELETE SET NULL,
  title text NOT NULL,
  status text NOT NULL DEFAULT 'hold' CHECK (status IN ('hold', 'confirmed', 'completed', 'cancelled')),
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  location text,
  call_time text,
  brief text,
  logistics_notes text,                       -- travel, rider, parking: editable by road managers
  onsite_contact jsonb NOT NULL DEFAULT '{}', -- { name, phone }
  fee_cents integer CHECK (fee_cents IS NULL OR fee_cents >= 0),
  currency text NOT NULL DEFAULT 'GBP',
  commission_percent numeric(5,2) CHECK (commission_percent IS NULL OR (commission_percent >= 0 AND commission_percent <= 100)),
  client_visible_to_talent boolean NOT NULL DEFAULT false,
  shared_with_talent boolean NOT NULL DEFAULT true,
  talent_response text NOT NULL DEFAULT 'pending' CHECK (talent_response IN ('pending', 'accepted', 'declined')),
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (ends_at > starts_at)
);
CREATE INDEX IF NOT EXISTS idx_bookings_talent_time ON bookings (talent_id, starts_at);
CREATE INDEX IF NOT EXISTS idx_bookings_time ON bookings (starts_at);
CREATE INDEX IF NOT EXISTS idx_bookings_deal ON bookings (deal_id);

-- Days a talent can't (or might not) work
CREATE TABLE IF NOT EXISTS talent_availability (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  talent_id uuid NOT NULL REFERENCES talents(id) ON DELETE CASCADE,
  starts_on date NOT NULL,
  ends_on date NOT NULL,
  kind text NOT NULL DEFAULT 'unavailable' CHECK (kind IN ('unavailable', 'tentative')),
  note text,
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (ends_on >= starts_on)
);
CREATE INDEX IF NOT EXISTS idx_availability_talent ON talent_availability (talent_id, starts_on);

-- One private, revocable calendar subscription link per person (only a hash is stored)
CREATE TABLE IF NOT EXISTS calendar_feeds (
  user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_used_at timestamptz
);

COMMIT;
