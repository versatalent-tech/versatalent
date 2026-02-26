-- VersaTalent NFC Membership System - Initial Schema
-- Run this SQL in your Neon database console

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT,
  role TEXT NOT NULL CHECK (role IN ('artist', 'vip', 'staff', 'admin')),
  avatar_url TEXT,
  talent_id TEXT, -- Reference to existing talent system (optional)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- NFC Cards table
CREATE TABLE IF NOT EXISTS nfc_cards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  card_uid TEXT UNIQUE NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('artist', 'vip', 'staff')),
  is_active BOOLEAN DEFAULT TRUE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Events table (extends existing events system)
CREATE TABLE IF NOT EXISTS nfc_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  date TIMESTAMP WITH TIME ZONE NOT NULL,
  location TEXT,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Check-ins table
CREATE TABLE IF NOT EXISTS checkins (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  nfc_card_id UUID REFERENCES nfc_cards(id) ON DELETE SET NULL,
  event_id UUID REFERENCES nfc_events(id) ON DELETE SET NULL,
  source TEXT NOT NULL CHECK (source IN ('artist_profile', 'vip_pass', 'event_checkin', 'admin')),
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  metadata JSONB DEFAULT '{}',
  ip_address TEXT,
  user_agent TEXT
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_nfc_cards_card_uid ON nfc_cards(card_uid);
CREATE INDEX IF NOT EXISTS idx_nfc_cards_user_id ON nfc_cards(user_id);
CREATE INDEX IF NOT EXISTS idx_nfc_cards_type ON nfc_cards(type);
CREATE INDEX IF NOT EXISTS idx_checkins_user_id ON checkins(user_id);
CREATE INDEX IF NOT EXISTS idx_checkins_event_id ON checkins(event_id);
CREATE INDEX IF NOT EXISTS idx_checkins_timestamp ON checkins(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_checkins_source ON checkins(source);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_nfc_cards_updated_at
  BEFORE UPDATE ON nfc_cards
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_nfc_events_updated_at
  BEFORE UPDATE ON nfc_events
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Insert a default admin user (password: admin123 - CHANGE THIS!)
-- Password hash generated with bcryptjs
INSERT INTO users (email, name, role, password_hash)
VALUES (
  'admin@versatalent.com',
  'Admin User',
  'admin',
  '$2a$10$rOzJz8EqKqZ7GqKqH7qV0u5YqKqZ7GqKqH7qV0u5YqKqZ7GqKqH7qV' -- This is a placeholder
) ON CONFLICT (email) DO NOTHING;

-- Sample data (optional - remove in production)
-- Sample VIP user
INSERT INTO users (email, name, role, avatar_url)
VALUES (
  'vip@example.com',
  'VIP Guest',
  'vip',
  NULL
) ON CONFLICT (email) DO NOTHING;

-- Sample NFC card for VIP
INSERT INTO nfc_cards (card_uid, user_id, type, metadata)
SELECT 
  'SAMPLE-VIP-001',
  id,
  'vip',
  '{"membership_tier": "platinum", "benefits": ["Backstage access", "Priority booking", "Exclusive events"]}'::jsonb
FROM users 
WHERE email = 'vip@example.com'
ON CONFLICT (card_uid) DO NOTHING;
