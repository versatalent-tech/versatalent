-- Migration 007: Link Users to Talents
-- Update talent_id in users table to be UUID and add foreign key constraint
-- This allows talents to have user accounts for dashboard access

-- First, remove any existing data in talent_id (since it's TEXT and we're changing to UUID)
UPDATE users SET talent_id = NULL WHERE talent_id IS NOT NULL;

-- Change talent_id column from TEXT to UUID
ALTER TABLE users ALTER COLUMN talent_id TYPE uuid USING talent_id::uuid;

-- Add foreign key constraint to link users.talent_id -> talents.id
ALTER TABLE users
  ADD CONSTRAINT fk_users_talent_id
  FOREIGN KEY (talent_id)
  REFERENCES talents(id)
  ON DELETE SET NULL;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_talent_id ON users(talent_id);

-- Add unique constraint so one talent can only have one user account
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_talent_id_unique ON users(talent_id) WHERE talent_id IS NOT NULL;

COMMENT ON COLUMN users.talent_id IS 'References talents.id - links a user account to a talent profile for dashboard access';
