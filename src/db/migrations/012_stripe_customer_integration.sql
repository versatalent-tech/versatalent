-- Migration 012: Stripe Customer Integration
-- Link VersaTalent users with Stripe customers for payment tracking
-- Run this SQL in your Neon database console after previous migrations

-- ============================================
-- ADD STRIPE CUSTOMER ID TO USERS TABLE
-- ============================================

-- Add stripe_customer_id column to users table
-- This will store the Stripe customer ID (cus_xxx) for each user
ALTER TABLE users
ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;

-- Add index for fast lookups by Stripe customer ID
CREATE INDEX IF NOT EXISTS idx_users_stripe_customer_id
ON users(stripe_customer_id)
WHERE stripe_customer_id IS NOT NULL;

-- Add unique constraint to prevent duplicate Stripe customers
-- This ensures one Stripe customer per VersaTalent user
ALTER TABLE users
ADD CONSTRAINT unique_stripe_customer_id
UNIQUE (stripe_customer_id);

-- ============================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================

COMMENT ON COLUMN users.stripe_customer_id IS
'Stripe Customer ID (cus_xxx) - Created when user signs up, used for all payments';

-- ============================================
-- MIGRATION VALIDATION
-- ============================================

-- Verify the column was added successfully
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users'
    AND column_name = 'stripe_customer_id'
  ) THEN
    RAISE EXCEPTION 'Migration failed: stripe_customer_id column not found';
  END IF;

  RAISE NOTICE 'Migration 012 completed successfully';
  RAISE NOTICE 'Added stripe_customer_id column to users table';
  RAISE NOTICE 'Created index on stripe_customer_id';
  RAISE NOTICE 'Added unique constraint';
END $$;
