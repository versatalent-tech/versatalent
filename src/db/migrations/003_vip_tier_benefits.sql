-- VersaTalent VIP Tier Benefits Migration
-- Run this SQL in your Neon database console after 002_vip_points_system.sql

-- VIP Tier Benefits Table
CREATE TABLE IF NOT EXISTS vip_tier_benefits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tier_name TEXT NOT NULL CHECK (tier_name IN ('silver', 'gold', 'black')),
  title TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_vip_tier_benefits_tier_name ON vip_tier_benefits(tier_name);
CREATE INDEX IF NOT EXISTS idx_vip_tier_benefits_is_active ON vip_tier_benefits(is_active);
CREATE INDEX IF NOT EXISTS idx_vip_tier_benefits_tier_active ON vip_tier_benefits(tier_name, is_active);

-- Apply updated_at trigger
CREATE TRIGGER update_vip_tier_benefits_updated_at
  BEFORE UPDATE ON vip_tier_benefits
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Insert default benefits for each tier
INSERT INTO vip_tier_benefits (tier_name, title, description, is_active) VALUES
  -- Silver Tier Benefits
  ('silver', 'Standard VIP Access', 'Access to all VIP-designated areas at events', TRUE),
  ('silver', 'Event Invitations', 'Receive invitations to exclusive VersaTalent events', TRUE),
  ('silver', 'Points Accumulation', 'Earn points on event check-ins and purchases', TRUE),
  ('silver', 'Member Support', 'Dedicated VIP support line for assistance', TRUE),

  -- Gold Tier Benefits
  ('gold', 'Priority Entry', 'Skip the line with priority entry to all events', TRUE),
  ('gold', 'Backstage Access', 'Exclusive backstage access at select performances', TRUE),
  ('gold', 'VIP Lounge Access', 'Access to premium VIP lounges with complimentary refreshments', TRUE),
  ('gold', 'Enhanced Points Rate', 'Earn 1.5x points on all activities', TRUE),
  ('gold', 'Special Event Invitations', 'First access to limited-capacity exclusive events', TRUE),
  ('gold', 'Meet & Greet Opportunities', 'Priority booking for artist meet and greets', TRUE),

  -- Black Tier Benefits
  ('black', 'Platinum Priority Service', 'Highest priority for all services and events', TRUE),
  ('black', 'Private Artist Sessions', 'Exclusive private sessions with VersaTalent artists', TRUE),
  ('black', 'Luxury VIP Suite Access', 'Access to premium suites with premium catering', TRUE),
  ('black', 'Concierge Service', '24/7 dedicated VIP concierge service', TRUE),
  ('black', 'Double Points Rate', 'Earn 2x points on all activities and purchases', TRUE),
  ('black', 'Exclusive Merchandise', 'Limited edition VersaTalent merchandise and collectibles', TRUE),
  ('black', 'Front Row Seating', 'Guaranteed front row or premium seating at events', TRUE),
  ('black', 'Travel & Accommodation Perks', 'Special rates on travel and accommodation for events', TRUE)
ON CONFLICT DO NOTHING;

-- Sample query to verify installation
-- SELECT tier_name, COUNT(*) as benefit_count
-- FROM vip_tier_benefits
-- WHERE is_active = TRUE
-- GROUP BY tier_name
-- ORDER BY CASE tier_name
--   WHEN 'silver' THEN 1
--   WHEN 'gold' THEN 2
--   WHEN 'black' THEN 3
-- END;
