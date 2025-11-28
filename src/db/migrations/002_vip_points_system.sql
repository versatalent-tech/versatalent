-- VersaTalent VIP Points & Tier System Migration
-- Run this SQL in your Neon database console after 001_initial_schema.sql

-- VIP Memberships Table
CREATE TABLE IF NOT EXISTS vip_memberships (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  tier TEXT NOT NULL CHECK (tier IN ('silver', 'gold', 'black')) DEFAULT 'silver',
  points_balance INTEGER DEFAULT 0 CHECK (points_balance >= 0),
  lifetime_points INTEGER DEFAULT 0 CHECK (lifetime_points >= 0),
  status TEXT NOT NULL CHECK (status IN ('active', 'suspended', 'cancelled')) DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- VIP Consumptions Table
CREATE TABLE IF NOT EXISTS vip_consumptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  event_id UUID REFERENCES nfc_events(id) ON DELETE SET NULL,
  amount NUMERIC(10, 2) NOT NULL CHECK (amount >= 0),
  currency TEXT DEFAULT 'EUR',
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- VIP Points Log Table
CREATE TABLE IF NOT EXISTS vip_points_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('event_checkin', 'consumption', 'manual_adjust', 'tier_bonus')),
  ref_id UUID,
  delta_points INTEGER NOT NULL,
  balance_after INTEGER NOT NULL CHECK (balance_after >= 0),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- VIP Point Rules Table (optional but recommended)
CREATE TABLE IF NOT EXISTS vip_point_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  action_type TEXT UNIQUE NOT NULL,
  points_per_unit NUMERIC(10, 2) NOT NULL,
  unit TEXT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_vip_memberships_user_id ON vip_memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_vip_memberships_tier ON vip_memberships(tier);
CREATE INDEX IF NOT EXISTS idx_vip_memberships_status ON vip_memberships(status);
CREATE INDEX IF NOT EXISTS idx_vip_consumptions_user_id ON vip_consumptions(user_id);
CREATE INDEX IF NOT EXISTS idx_vip_consumptions_event_id ON vip_consumptions(event_id);
CREATE INDEX IF NOT EXISTS idx_vip_consumptions_created_at ON vip_consumptions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_vip_points_log_user_id ON vip_points_log(user_id);
CREATE INDEX IF NOT EXISTS idx_vip_points_log_source ON vip_points_log(source);
CREATE INDEX IF NOT EXISTS idx_vip_points_log_created_at ON vip_points_log(created_at DESC);

-- Apply updated_at triggers
CREATE TRIGGER update_vip_memberships_updated_at
  BEFORE UPDATE ON vip_memberships
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_vip_point_rules_updated_at
  BEFORE UPDATE ON vip_point_rules
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Insert default point rules
-- Note: consumption is 1 point per 3 euros (0.333333 points per euro)
INSERT INTO vip_point_rules (action_type, points_per_unit, unit, is_active)
VALUES
  ('event_checkin', 10, 'event', TRUE),
  ('consumption', 0.333333, 'euro', TRUE),
  ('manual_adjust', 1, 'point', TRUE)
ON CONFLICT (action_type) DO NOTHING;

-- Function to calculate tier based on points
CREATE OR REPLACE FUNCTION calculate_vip_tier(points INTEGER)
RETURNS TEXT AS $$
BEGIN
  IF points >= 1750 THEN
    RETURN 'black';
  ELSIF points >= 500 THEN
    RETURN 'gold';
  ELSE
    RETURN 'silver';
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to automatically upgrade tier when points change
CREATE OR REPLACE FUNCTION auto_upgrade_vip_tier()
RETURNS TRIGGER AS $$
DECLARE
  new_tier TEXT;
BEGIN
  new_tier := calculate_vip_tier(NEW.points_balance);

  IF new_tier != NEW.tier THEN
    NEW.tier := new_tier;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-upgrade tier on points update
CREATE TRIGGER trigger_auto_upgrade_vip_tier
  BEFORE UPDATE OF points_balance ON vip_memberships
  FOR EACH ROW
  WHEN (OLD.points_balance IS DISTINCT FROM NEW.points_balance)
  EXECUTE FUNCTION auto_upgrade_vip_tier();

-- Create VIP membership for existing VIP users
INSERT INTO vip_memberships (user_id, tier, points_balance, lifetime_points, status)
SELECT id, 'silver', 0, 0, 'active'
FROM users
WHERE role = 'vip'
ON CONFLICT (user_id) DO NOTHING;

-- Sample data (optional - remove in production)
-- Sample VIP user with gold tier
DO $$
DECLARE
  sample_user_id UUID;
BEGIN
  SELECT id INTO sample_user_id FROM users WHERE email = 'vip@example.com' LIMIT 1;

  IF sample_user_id IS NOT NULL THEN
    -- Create VIP membership
    INSERT INTO vip_memberships (user_id, tier, points_balance, lifetime_points, status)
    VALUES (sample_user_id, 'gold', 750, 750, 'active')
    ON CONFLICT (user_id) DO UPDATE
    SET points_balance = 750, lifetime_points = 750, tier = 'gold';

    -- Add sample consumption
    INSERT INTO vip_consumptions (user_id, amount, currency, description)
    VALUES (sample_user_id, 150.00, 'EUR', 'VIP lounge access and drinks')
    ON CONFLICT DO NOTHING;

    -- Add sample points log
    INSERT INTO vip_points_log (user_id, source, delta_points, balance_after, metadata)
    VALUES
      (sample_user_id, 'consumption', 150, 150, '{"amount": 150, "currency": "EUR"}'::jsonb),
      (sample_user_id, 'event_checkin', 10, 160, '{"event": "Sample Event"}'::jsonb)
    ON CONFLICT DO NOTHING;
  END IF;
END $$;
