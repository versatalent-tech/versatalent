-- 030: V•PRIVILEGE Founding Membership
--
-- A one-off payment for 12 months of extra benefits (no auto-renewal).
-- Separate from the Silver/Gold/Black tiers: it never changes tier or points.
-- Benefits are records admins manage; each purchase keeps a copy of the
-- benefits it was sold with, honoured until it ends.

BEGIN;

INSERT INTO programme_settings (key, value) VALUES
  ('founding_on_sale', 'false'),       -- off until benefits, costs and terms are approved
  ('founding_price_cents', '2999'),
  ('founding_cap', '500')              -- numbered cards in the founding run
ON CONFLICT (key) DO NOTHING;

-- What the membership includes. Paused = not offered on new purchases;
-- retired = no longer used (kept for history).
CREATE TABLE IF NOT EXISTS membership_benefits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  limit_text text,
  eligibility_text text,
  owner text,
  unit_cost_cents integer CHECK (unit_cost_cents IS NULL OR unit_cost_cents >= 0),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'retired')),
  sort_order integer NOT NULL DEFAULT 0,
  updated_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- One founding number per person, kept when they renew
CREATE TABLE IF NOT EXISTS founding_members (
  user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  founding_number integer NOT NULL UNIQUE CHECK (founding_number > 0),
  assigned_at timestamptz NOT NULL DEFAULT now()
);

-- Each purchase (12 months). A renewal is a new row starting when the
-- previous one ends.
CREATE TABLE IF NOT EXISTS paid_memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'active', 'payment_failed', 'cancelled', 'expired', 'refunded')),
  price_cents integer NOT NULL CHECK (price_cents >= 0),
  currency text NOT NULL DEFAULT 'GBP',
  -- online (SumUp hosted page) or in_person (recorded by staff)
  source text NOT NULL DEFAULT 'online' CHECK (source IN ('online', 'in_person')),
  payment_method text,                    -- in person: sumup_reader, sumup_app, cash
  benefits jsonb NOT NULL DEFAULT '[]',   -- what this purchase includes
  terms_version text,
  starts_at timestamptz,
  ends_at timestamptz,
  sumup_checkout_id text,
  sumup_transaction_code text,
  payment_reference text,                 -- in person: receipt or transaction code
  payment_attempts integer NOT NULL DEFAULT 0,
  paid_at timestamptz,
  needs_refund boolean NOT NULL DEFAULT false,
  notes text,
  handled_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (status NOT IN ('active', 'expired') OR (starts_at IS NOT NULL AND ends_at IS NOT NULL AND paid_at IS NOT NULL))
);
CREATE INDEX IF NOT EXISTS idx_paid_memberships_user ON paid_memberships (user_id, ends_at);
CREATE INDEX IF NOT EXISTS idx_paid_memberships_status ON paid_memberships (status, ends_at);
-- At most one unpaid purchase in progress per person
CREATE UNIQUE INDEX IF NOT EXISTS idx_paid_memberships_one_pending ON paid_memberships (user_id) WHERE status = 'pending';

-- Every SumUp payment page created for a purchase
CREATE TABLE IF NOT EXISTS paid_membership_checkouts (
  checkout_id text PRIMARY KEY,
  membership_id uuid NOT NULL REFERENCES paid_memberships(id) ON DELETE CASCADE,
  reference text NOT NULL UNIQUE,
  amount_cents integer NOT NULL,
  currency text NOT NULL,
  outcome text NOT NULL DEFAULT 'pending' CHECK (outcome IN ('pending', 'paid', 'failed', 'expired')),
  transaction_code text,
  refunded_at timestamptz,               -- refunded in SumUp (recorded by staff)
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE paid_membership_checkouts ADD COLUMN IF NOT EXISTS refunded_at timestamptz;
CREATE INDEX IF NOT EXISTS idx_paid_membership_checkouts_membership ON paid_membership_checkouts (membership_id);

-- Joining as a Founding Member: the card request is paid for by the
-- membership ("included") instead of the delivery fee
ALTER TABLE card_requests ADD COLUMN IF NOT EXISTS paid_membership_id uuid REFERENCES paid_memberships(id) ON DELETE SET NULL;
ALTER TABLE card_requests DROP CONSTRAINT IF EXISTS card_requests_payment_status_check;
ALTER TABLE card_requests ADD CONSTRAINT card_requests_payment_status_check
  CHECK (payment_status IN ('pending', 'paid', 'failed', 'expired', 'waived', 'refunded', 'included'));

-- Launch configuration from the benefit sheet (draft; edit in the admin)
INSERT INTO membership_benefits (title, description, limit_text, eligibility_text, owner, unit_cost_cents, status, sort_order)
SELECT * FROM (VALUES
  ('Numbered Founding card', 'Your own numbered V•PRIVILEGE Founding card.', 'One per member; replacement £5', 'Issued once payment is confirmed', 'Membership lead', 350, 'active', 10),
  ('Priority entry lane', 'Skip the main queue in the V•PRIVILEGE lane.', 'Faster queue only; security and capacity checks still apply', 'Active membership when your card is scanned', 'Door lead', 0, 'active', 20),
  ('48-hour early ticket access', 'Buy tickets 48 hours before general sale.', 'Up to 2 tickets per member per event, while presale allocation lasts', 'Active members when the presale opens', 'Events lead', 0, 'active', 30),
  ('Welcome drink', 'A drink on us from the selected drinks list.', 'Once per member; claim within 90 days', '18+', 'Bar manager', 150, 'active', 40),
  ('Birthday drink', 'A drink on us in your birthday month.', 'Once per membership year, during your birthday month', '18+', 'Bar manager', 150, 'active', 50),
  ('Two guest passes a year', 'Bring a friend to one of our events.', '2 per membership year; 1 per event; not valid at events marked "no guest passes"', 'Guest named at least 24 hours before; guest must be 18+', 'Door lead', 200, 'active', 60),
  ('Members'' nights, four a year', 'Early-doors sessions with VersaTalent artists.', '80 places per night, first come first served', 'Active members who RSVP', 'Events lead', NULL, 'active', 70),
  ('Artist experience ballots', 'A chance to meet artists, watch a soundcheck or join a photo session.', '4 ballots a year, about 5 winners each; one entry per member per ballot', 'Active members', 'Talent manager', NULL, 'active', 80),
  ('Members'' updates and Founding wall', 'Monthly first look at line-ups, and your name on the Founding wall if you choose.', 'One update a month; wall is opt-in', 'Updates need email consent', 'Marketing lead', 0, 'active', 90),
  ('No booking fee', 'No booking fee on VersaTalent-promoted events.', '2 tickets per event', 'Active members', 'Events lead', 150, 'paused', 100),
  ('Free cloakroom', 'Free cloakroom where the venue allows it.', 'Venues that allow it', 'Active members', 'Venue liaison', 200, 'paused', 110)
) AS seed(title, description, limit_text, eligibility_text, owner, unit_cost_cents, status, sort_order)
WHERE NOT EXISTS (SELECT 1 FROM membership_benefits);

COMMIT;
