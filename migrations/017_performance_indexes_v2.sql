-- ============================================
-- PERFORMANCE INDEXES V2
-- Enhanced indexes for faster queries
-- ============================================

-- ============================================
-- TALENTS TABLE INDEXES
-- ============================================

-- Composite index for talent listing with filters
CREATE INDEX IF NOT EXISTS idx_talents_list_filters
ON talents (is_active, featured, industry, gender)
WHERE is_active = true;

-- Index for text search on talent names
CREATE INDEX IF NOT EXISTS idx_talents_name_search
ON talents USING gin (to_tsvector('english', name || ' ' || COALESCE(profession, '') || ' ' || COALESCE(tagline, '')));

-- Index for location-based queries
CREATE INDEX IF NOT EXISTS idx_talents_location
ON talents (location)
WHERE is_active = true;

-- Index for industry-specific listings
CREATE INDEX IF NOT EXISTS idx_talents_by_industry
ON talents (industry, created_at DESC)
WHERE is_active = true;

-- ============================================
-- EVENTS TABLE INDEXES
-- ============================================

-- Composite index for event listing
CREATE INDEX IF NOT EXISTS idx_events_list
ON events (is_published, start_time DESC, featured)
WHERE is_published = true;

-- Index for upcoming events query
CREATE INDEX IF NOT EXISTS idx_events_upcoming
ON events (start_time)
WHERE is_published = true AND status = 'upcoming';

-- Index for event status transitions
CREATE INDEX IF NOT EXISTS idx_events_status_date
ON events (status, start_time, end_time);

-- Index for featured events
CREATE INDEX IF NOT EXISTS idx_events_featured
ON events (featured, start_time)
WHERE featured = true AND is_published = true;

-- Text search on events
CREATE INDEX IF NOT EXISTS idx_events_search
ON events USING gin (to_tsvector('english', title || ' ' || COALESCE(description, '')));

-- ============================================
-- USERS TABLE INDEXES
-- ============================================

-- Index for email lookups (login)
CREATE INDEX IF NOT EXISTS idx_users_email_lower
ON users (LOWER(email));

-- Index for role-based queries
CREATE INDEX IF NOT EXISTS idx_users_by_role
ON users (role, created_at DESC);

-- Index for Stripe customer lookups
CREATE INDEX IF NOT EXISTS idx_users_stripe_customer
ON users (stripe_customer_id)
WHERE stripe_customer_id IS NOT NULL;

-- Index for user-talent relationship
CREATE INDEX IF NOT EXISTS idx_users_talent_id
ON users (talent_id)
WHERE talent_id IS NOT NULL;

-- ============================================
-- VIP SYSTEM INDEXES
-- ============================================

-- Index for VIP membership lookups
CREATE INDEX IF NOT EXISTS idx_vip_memberships_user_status
ON vip_memberships (user_id, status);

-- Index for tier-based queries
CREATE INDEX IF NOT EXISTS idx_vip_memberships_tier
ON vip_memberships (tier, points_balance DESC)
WHERE status = 'active';

-- Index for points log queries
CREATE INDEX IF NOT EXISTS idx_vip_points_log_user_date
ON vip_points_log (user_id, created_at DESC);

-- Index for consumption tracking
CREATE INDEX IF NOT EXISTS idx_vip_consumptions_user_date
ON vip_consumptions (user_id, created_at DESC);

-- Index for event-based consumption
CREATE INDEX IF NOT EXISTS idx_vip_consumptions_event
ON vip_consumptions (event_id, created_at DESC)
WHERE event_id IS NOT NULL;

-- ============================================
-- POS SYSTEM INDEXES
-- ============================================

-- Index for order listing
CREATE INDEX IF NOT EXISTS idx_pos_orders_list
ON pos_orders (status, created_at DESC);

-- Index for customer order history
CREATE INDEX IF NOT EXISTS idx_pos_orders_customer
ON pos_orders (customer_user_id, created_at DESC)
WHERE customer_user_id IS NOT NULL;

-- Index for staff order tracking
CREATE INDEX IF NOT EXISTS idx_pos_orders_staff
ON pos_orders (staff_user_id, created_at DESC)
WHERE staff_user_id IS NOT NULL;

-- Index for Stripe payment lookups
CREATE INDEX IF NOT EXISTS idx_pos_orders_stripe
ON pos_orders (stripe_payment_intent_id)
WHERE stripe_payment_intent_id IS NOT NULL;

-- Index for order items by order
CREATE INDEX IF NOT EXISTS idx_pos_order_items_order
ON pos_order_items (order_id);

-- Index for product sales analytics
CREATE INDEX IF NOT EXISTS idx_pos_order_items_product
ON pos_order_items (product_id, created_at DESC);

-- ============================================
-- PRODUCTS TABLE INDEXES
-- ============================================

-- Index for active products
CREATE INDEX IF NOT EXISTS idx_products_active
ON products (is_active, category, name)
WHERE is_active = true;

-- Index for low stock alerts
CREATE INDEX IF NOT EXISTS idx_products_low_stock
ON products (stock_quantity, low_stock_threshold)
WHERE is_active = true;

-- ============================================
-- NFC SYSTEM INDEXES
-- ============================================

-- Index for card UID lookups (fast scan)
CREATE INDEX IF NOT EXISTS idx_nfc_cards_uid
ON nfc_cards (card_uid)
WHERE is_active = true;

-- Index for user's cards
CREATE INDEX IF NOT EXISTS idx_nfc_cards_user
ON nfc_cards (user_id, type);

-- ============================================
-- CHECK-INS INDEXES
-- ============================================

-- Index for event check-ins
CREATE INDEX IF NOT EXISTS idx_checkins_event
ON checkins (event_id, timestamp DESC)
WHERE event_id IS NOT NULL;

-- Index for user check-in history
CREATE INDEX IF NOT EXISTS idx_checkins_user
ON checkins (user_id, timestamp DESC);

-- ============================================
-- BLOGS TABLE INDEXES
-- ============================================

-- Index for published blog listing
CREATE INDEX IF NOT EXISTS idx_blogs_published
ON blogs (is_published, published_at DESC)
WHERE is_published = true;

-- Index for blog search
CREATE INDEX IF NOT EXISTS idx_blogs_search
ON blogs USING gin (to_tsvector('english', title || ' ' || COALESCE(excerpt, '') || ' ' || COALESCE(content, '')));

-- Index for blog categories
CREATE INDEX IF NOT EXISTS idx_blogs_category
ON blogs (category, published_at DESC)
WHERE is_published = true;

-- ============================================
-- NEWSLETTER TABLE INDEXES
-- ============================================

-- Index for active subscribers
CREATE INDEX IF NOT EXISTS idx_newsletter_active
ON newsletter_subscribers (is_active, subscribed_at DESC)
WHERE is_active = true;

-- Index for email lookups
CREATE INDEX IF NOT EXISTS idx_newsletter_email
ON newsletter_subscribers (LOWER(email));

-- ============================================
-- INVENTORY MOVEMENTS INDEXES
-- ============================================

-- Index for product inventory history
CREATE INDEX IF NOT EXISTS idx_inventory_movements_product
ON inventory_movements (product_id, created_at DESC);

-- Index for order-related movements
CREATE INDEX IF NOT EXISTS idx_inventory_movements_order
ON inventory_movements (related_order_id)
WHERE related_order_id IS NOT NULL;

-- ============================================
-- ANALYTICS: Query Execution Plans
-- Run ANALYZE after creating indexes
-- ============================================

-- Note: Run these commands after migration:
-- ANALYZE talents;
-- ANALYZE events;
-- ANALYZE users;
-- ANALYZE vip_memberships;
-- ANALYZE pos_orders;
-- ANALYZE products;
-- ANALYZE nfc_cards;
-- ANALYZE checkins;
-- ANALYZE blogs;
-- ANALYZE newsletter_subscribers;
