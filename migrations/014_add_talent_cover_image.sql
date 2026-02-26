-- Migration 014: Add cover_image field for talents
-- Date: December 24, 2025
-- Purpose: Add landscape cover image field for talent profiles

-- Add cover_image column to talents table
ALTER TABLE talents
ADD COLUMN cover_image TEXT;

-- Add comment
COMMENT ON COLUMN talents.cover_image IS 'URL to landscape cover/banner image for talent profile';

-- No index needed as this won't be queried directly
