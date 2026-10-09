-- 029: public membership sign-up with a posted card
--
-- People apply online (18+), pay a card delivery fee through SumUp's hosted
-- checkout, and staff assign, write and post their NFC card.

BEGIN;

-- Programme switches and settings an admin can change
CREATE TABLE IF NOT EXISTS programme_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  updated_by uuid REFERENCES users(id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO programme_settings (key, value) VALUES
  ('signup_open', 'false'),            -- off until the terms are approved
  ('card_delivery_fee_cents', '299'),
  ('terms_version', '"2026-10-draft"')
ON CONFLICT (key) DO NOTHING;

-- Extra profile details captured at sign-up
ALTER TABLE vip_profiles ADD COLUMN IF NOT EXISTS date_of_birth date;
ALTER TABLE vip_profiles ADD COLUMN IF NOT EXISTS terms_accepted_at timestamptz;
ALTER TABLE vip_profiles ADD COLUMN IF NOT EXISTS terms_version text;
ALTER TABLE vip_profiles ADD COLUMN IF NOT EXISTS founding_interest boolean NOT NULL DEFAULT false;
ALTER TABLE vip_profiles ADD COLUMN IF NOT EXISTS signup_source text;

-- One request per card to post. The address is copied here so the label
-- matches what was paid for, even if the profile changes later.
CREATE TABLE IF NOT EXISTS card_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'awaiting_payment'
    CHECK (status IN ('awaiting_payment', 'to_post', 'card_assigned', 'posted', 'cancelled')),
  recipient_name text NOT NULL,
  address_line1 text NOT NULL,
  address_line2 text,
  city text NOT NULL,
  postcode text NOT NULL,
  country text NOT NULL DEFAULT 'United Kingdom',
  fee_cents integer NOT NULL CHECK (fee_cents >= 0),
  currency text NOT NULL DEFAULT 'GBP',
  payment_status text NOT NULL DEFAULT 'pending'
    CHECK (payment_status IN ('pending', 'paid', 'failed', 'expired', 'waived', 'refunded')),
  sumup_checkout_id text UNIQUE,
  sumup_checkout_reference text UNIQUE,
  sumup_transaction_code text,
  payment_attempts integer NOT NULL DEFAULT 0,
  paid_at timestamptz,
  nfc_card_id uuid REFERENCES nfc_cards(id) ON DELETE SET NULL,
  posted_at timestamptz,
  tracking_reference text,
  notes text,
  handled_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_card_requests_status ON card_requests (status, created_at);

-- Set when money arrived that we don't need (e.g. an old payment page completed
-- after a newer one, or payment after cancellation): refund it in SumUp
ALTER TABLE card_requests ADD COLUMN IF NOT EXISTS needs_refund boolean NOT NULL DEFAULT false;

-- Every SumUp checkout created for a request, so a payment on an older
-- payment page is still recognised
CREATE TABLE IF NOT EXISTS card_request_checkouts (
  checkout_id text PRIMARY KEY,
  request_id uuid NOT NULL REFERENCES card_requests(id) ON DELETE CASCADE,
  reference text NOT NULL UNIQUE,
  amount_cents integer NOT NULL,
  currency text NOT NULL,
  outcome text NOT NULL DEFAULT 'pending' CHECK (outcome IN ('pending', 'paid', 'failed', 'expired')),
  transaction_code text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_card_request_checkouts_request ON card_request_checkouts (request_id);
-- A member has at most one card request in progress
CREATE UNIQUE INDEX IF NOT EXISTS idx_card_requests_one_open ON card_requests (user_id)
  WHERE status IN ('awaiting_payment', 'to_post', 'card_assigned');

COMMIT;
