-- Migration: Add industry_details column to talents table
-- This stores industry-specific fields like:
-- - Modeling: height, chest, waist, hips, shoe size, dress size, hair colour, etc.
-- - Sports: positions played, teams, goals, assists, league, etc.
-- - Music: genre, record label, streaming links, etc.
-- - Acting: acting type, agencies, notable roles, etc.
-- - Culinary: cuisine specialties, restaurants, certifications, etc.

ALTER TABLE talents
ADD COLUMN IF NOT EXISTS industry_details JSONB DEFAULT '{}';

-- Create index for querying industry_details
CREATE INDEX IF NOT EXISTS idx_talents_industry_details ON talents USING GIN (industry_details);

-- Comments for documentation
COMMENT ON COLUMN talents.industry_details IS 'Industry-specific details stored as JSON. Structure varies by industry type.';
