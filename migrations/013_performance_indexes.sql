-- Migration 013: Performance Optimization Indexes
-- Adds indexes to improve query performance across all tables
-- Run this SQL in your Neon database console
-- Date: December 17, 2025

-- ============================================
-- POS ORDERS - Enhanced Indexes
-- ============================================

-- Composite index for purchase history queries (customer + status + time)
CREATE INDEX IF NOT EXISTS idx_pos_orders_customer_status_created
  ON pos_orders(customer_user_id, status, created_at DESC)
  WHERE customer_user_id IS NOT NULL;

-- Index for paid orders by date (reporting queries)
CREATE INDEX IF NOT EXISTS idx_pos_orders_paid_created
  ON pos_orders(created_at DESC)
  WHERE status = 'paid';

-- Index for staff performance tracking
CREATE INDEX IF NOT EXISTS idx_pos_orders_staff_created
  ON pos_orders(staff_user_id, created_at DESC)
  WHERE staff_user_id IS NOT NULL;

-- ============================================
-- NFC CHECK-INS - Performance Indexes
-- ============================================

-- Note: If nfc_checkins table doesn't exist, create it first
CREATE TABLE IF NOT EXISTS nfc_checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  nfc_card_id UUID REFERENCES nfc_cards(id) ON DELETE SET NULL,
  event_id UUID REFERENCES nfc_events(id) ON DELETE SET NULL,
  source TEXT NOT NULL CHECK (source IN ('artist_profile', 'vip_pass', 'event_checkin', 'admin')) DEFAULT 'event_checkin',
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  metadata JSONB DEFAULT '{}',
  ip_address TEXT,
  user_agent TEXT
);

-- Indexes for check-in queries
CREATE INDEX IF NOT EXISTS idx_nfc_checkins_user_id
  ON nfc_checkins(user_id);

CREATE INDEX IF NOT EXISTS idx_nfc_checkins_event_id
  ON nfc_checkins(event_id);

CREATE INDEX IF NOT EXISTS idx_nfc_checkins_timestamp
  ON nfc_checkins(timestamp DESC);

-- Composite index for event attendance tracking
CREATE INDEX IF NOT EXISTS idx_nfc_checkins_event_timestamp
  ON nfc_checkins(event_id, timestamp DESC)
  WHERE event_id IS NOT NULL;

-- Composite index for user check-in history
CREATE INDEX IF NOT EXISTS idx_nfc_checkins_user_timestamp
  ON nfc_checkins(user_id, timestamp DESC);

-- ============================================
-- VIP POINTS LOG - Enhanced Indexes
-- ============================================

-- Composite index for user points history
CREATE INDEX IF NOT EXISTS idx_vip_points_log_user_created
  ON vip_points_log(user_id, created_at DESC);

-- Index for audit/reporting by source type
CREATE INDEX IF NOT EXISTS idx_vip_points_log_source_created
  ON vip_points_log(source, created_at DESC);

-- ============================================
-- EVENTS - Enhanced Indexes
-- ============================================

-- Composite index for upcoming published events (most common query)
CREATE INDEX IF NOT EXISTS idx_events_upcoming_published
  ON events(start_time ASC)
  WHERE is_published = TRUE AND status = 'upcoming';

-- Index for featured events
CREATE INDEX IF NOT EXISTS idx_events_featured_start_time
  ON events(start_time ASC)
  WHERE featured = TRUE AND is_published = TRUE;

-- Index for events by status and time
CREATE INDEX IF NOT EXISTS idx_events_status_start_time
  ON events(status, start_time ASC);

-- ============================================
-- TALENTS - Performance Indexes
-- ============================================

-- Index for active featured talents
CREATE INDEX IF NOT EXISTS idx_talents_featured_active
  ON talents(featured, created_at DESC)
  WHERE is_active = TRUE;

-- Index for talents by industry
CREATE INDEX IF NOT EXISTS idx_talents_industry_active
  ON talents(industry, created_at DESC)
  WHERE is_active = TRUE;

-- ============================================
-- USERS - Enhanced Indexes
-- ============================================

-- Index for email lookups (if not already exists)
CREATE INDEX IF NOT EXISTS idx_users_email
  ON users(email);

-- Index for Stripe customer lookups
CREATE INDEX IF NOT EXISTS idx_users_stripe_customer_id
  ON users(stripe_customer_id)
  WHERE stripe_customer_id IS NOT NULL;

-- Index for talent ID lookups
CREATE INDEX IF NOT EXISTS idx_users_talent_id
  ON users(talent_id)
  WHERE talent_id IS NOT NULL;

-- ============================================
-- PRODUCTS - Enhanced Indexes
-- ============================================

-- Composite index for active products by category
CREATE INDEX IF NOT EXISTS idx_products_category_active
  ON products(category, name)
  WHERE is_active = TRUE;

-- ============================================
-- PRODUCT INVENTORY - Performance Indexes
-- ============================================

-- Index for low stock alerts
CREATE INDEX IF NOT EXISTS idx_product_inventory_stock
  ON product_inventory(current_quantity, product_id)
  WHERE current_quantity < 10;

-- ============================================
-- NFC CARDS - Enhanced Indexes
-- ============================================

-- Index for active cards lookup
CREATE INDEX IF NOT EXISTS idx_nfc_cards_active
  ON nfc_cards(is_active, user_id)
  WHERE is_active = TRUE;

-- ============================================
-- STATISTICS & COMMENTS
-- ============================================

-- Update table statistics for query planner
ANALYZE pos_orders;
ANALYZE pos_order_items;
ANALYZE nfc_checkins;
ANALYZE vip_points_log;
ANALYZE events;
ANALYZE talents;
ANALYZE users;
ANALYZE products;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Run these queries to verify indexes are created:
--
-- SELECT schemaname, tablename, indexname
-- FROM pg_indexes
-- WHERE tablename IN ('pos_orders', 'nfc_checkins', 'vip_points_log', 'events', 'talents')
-- ORDER BY tablename, indexname;
--
-- Check index usage:
-- SELECT schemaname, tablename, indexname, idx_scan, idx_tup_read, idx_tup_fetch
-- FROM pg_stat_user_indexes
-- WHERE schemaname = 'public'
-- ORDER BY idx_scan DESC;

-- ============================================
-- MIGRATION COMPLETE
-- ============================================

-- Expected Improvements:
-- 1. Purchase history queries: 3-5x faster
-- 2. Event listings: 2-3x faster
-- 3. Check-in history: 4-6x faster
-- 4. VIP points queries: 3-4x faster
-- 5. Talent browsing: 2-3x faster
