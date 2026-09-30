-- Migration 020: VIP profile details for marketing
--
-- Extra information captured when registering a VIP. Admin-only; never
-- returned by public endpoints. Marketing consent is recorded per channel
-- with the time it last changed (UK GDPR / PECR).

CREATE TABLE IF NOT EXISTS vip_profiles (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  phone TEXT,
  age_range TEXT CHECK (age_range IN ('18-24', '25-34', '35-44', '45-54', '55-64', '65+')),
  address_line1 TEXT,
  address_line2 TEXT,
  city TEXT,
  postcode TEXT,
  country TEXT,
  interests TEXT[] NOT NULL DEFAULT '{}',
  referral_source TEXT,
  consent_email BOOLEAN NOT NULL DEFAULT FALSE,
  consent_sms BOOLEAN NOT NULL DEFAULT FALSE,
  consent_post BOOLEAN NOT NULL DEFAULT FALSE,
  consent_updated_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vip_profiles_age_range ON vip_profiles(age_range);
CREATE INDEX IF NOT EXISTS idx_vip_profiles_city ON vip_profiles(LOWER(city));

DROP TRIGGER IF EXISTS update_vip_profiles_updated_at ON vip_profiles;
CREATE TRIGGER update_vip_profiles_updated_at
  BEFORE UPDATE ON vip_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE vip_profiles IS 'VIP registration details (age range, address, interests, marketing consent). Admin-only.';
