-- 032: referrals and the outreach queue
--
-- Referrals: every member gets a code; a friend who joins with it is
-- attributed to them. The referral is approved once the friend's attendance
-- is verified (staff check-in or a paid till order), and the reward is
-- reward points only. Suspicious ones wait for an admin.
--
-- Outreach: no email provider yet. The admin shows who to contact (welcome,
-- after an event, inactive, near the next tier, Founding renewal), staff send
-- the message themselves and mark it sent here, so nobody is contacted twice.

BEGIN;

INSERT INTO programme_settings (key, value) VALUES
  ('referrals_open', 'false'),
  ('referral_settings', '{"referrer_points": 50, "referee_points": 0, "min_order_cents": 1000, "yearly_cap": 10}')
ON CONFLICT (key) DO NOTHING;

CREATE TABLE IF NOT EXISTS member_referral_codes (
  user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  code text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  referee_id uuid NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE, -- a member can be referred once
  code text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'review', 'approved', 'rejected')),
  flags text[] NOT NULL DEFAULT '{}',          -- why it needs review
  qualified_at timestamptz,
  qualified_by text,                          -- checkin / order
  decided_at timestamptz,
  decided_by uuid REFERENCES users(id) ON DELETE SET NULL,
  reject_reason text,
  referrer_points integer NOT NULL DEFAULT 0,
  referee_points integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (referrer_id <> referee_id)
);
CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON referrals (referrer_id, status);
CREATE INDEX IF NOT EXISTS idx_referrals_status ON referrals (status, created_at DESC);

ALTER TABLE vip_points_log DROP CONSTRAINT IF EXISTS vip_points_log_source_check;
ALTER TABLE vip_points_log ADD CONSTRAINT vip_points_log_source_check CHECK (source IN (
  'event_checkin', 'consumption', 'consumption_pos', 'manual_adjust', 'tier_bonus',
  'opening_balance', 'reward_claim', 'reward_release', 'order_refund', 'year_end', 'referral_bonus'
));

-- Contacts sent by hand. dedupe_key stops one-off messages (e.g. "thanks for
-- coming to <event>") being listed again; campaigns with a cooldown use the date.
CREATE TABLE IF NOT EXISTS outreach_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  campaign text NOT NULL,
  dedupe_key text,
  channel text NOT NULL CHECK (channel IN ('email', 'sms', 'whatsapp', 'phone', 'in_person', 'other', 'skipped')),
  note text,
  sent_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_outreach_log_lookup ON outreach_log (campaign, user_id, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_outreach_log_dedupe ON outreach_log (campaign, dedupe_key) WHERE dedupe_key IS NOT NULL;

COMMIT;
