-- Migration 008: POS (Point of Sale) System
-- Lightweight POS for staff to process sales and award VIP points
-- Run this SQL in your Neon database console after previous migrations

-- ============================================
-- PRODUCTS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  price_cents INTEGER NOT NULL CHECK (price_cents >= 0),
  currency TEXT NOT NULL DEFAULT 'EUR',
  category TEXT,
  image_url TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  stock_quantity INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- POS ORDERS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS pos_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  customer_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  total_cents INTEGER NOT NULL CHECK (total_cents >= 0),
  currency TEXT NOT NULL DEFAULT 'EUR',
  stripe_payment_intent_id TEXT,
  status TEXT NOT NULL CHECK (status IN ('pending', 'paid', 'cancelled', 'failed')) DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- POS ORDER ITEMS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS pos_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES pos_orders(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price_cents INTEGER NOT NULL CHECK (unit_price_cents >= 0),
  line_total_cents INTEGER NOT NULL CHECK (line_total_cents >= 0),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_products_is_active ON products(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);

CREATE INDEX IF NOT EXISTS idx_pos_orders_staff_user_id ON pos_orders(staff_user_id);
CREATE INDEX IF NOT EXISTS idx_pos_orders_customer_user_id ON pos_orders(customer_user_id);
CREATE INDEX IF NOT EXISTS idx_pos_orders_status ON pos_orders(status);
CREATE INDEX IF NOT EXISTS idx_pos_orders_created_at ON pos_orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pos_orders_stripe_payment_intent_id ON pos_orders(stripe_payment_intent_id);

CREATE INDEX IF NOT EXISTS idx_pos_order_items_order_id ON pos_order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_pos_order_items_product_id ON pos_order_items(product_id);

-- ============================================
-- TRIGGERS
-- ============================================

CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_pos_orders_updated_at
  BEFORE UPDATE ON pos_orders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- SAMPLE DATA (Optional - for development)
-- ============================================

-- Sample products
INSERT INTO products (name, description, price_cents, currency, category, is_active, stock_quantity)
VALUES
  ('Espresso', 'Classic Italian espresso', 250, 'EUR', 'Drinks', TRUE, 100),
  ('Cappuccino', 'Espresso with steamed milk foam', 350, 'EUR', 'Drinks', TRUE, 100),
  ('Craft Beer', 'Local craft beer selection', 500, 'EUR', 'Drinks', TRUE, 50),
  ('Wine Glass', 'House wine by the glass', 600, 'EUR', 'Drinks', TRUE, 40),
  ('Cocktail', 'Signature cocktail', 800, 'EUR', 'Drinks', TRUE, 30),
  ('Sandwich', 'Fresh sandwich selection', 650, 'EUR', 'Food', TRUE, 25),
  ('Salad', 'Fresh seasonal salad', 750, 'EUR', 'Food', TRUE, 20),
  ('Burger', 'Gourmet burger with fries', 1200, 'EUR', 'Food', TRUE, 30),
  ('Event Ticket', 'VersaTalent event access', 2500, 'EUR', 'Tickets', TRUE, 100),
  ('VIP Pass', 'VIP lounge access', 5000, 'EUR', 'Tickets', TRUE, 20)
ON CONFLICT DO NOTHING;

-- Grant permissions (adjust as needed for your setup)
-- GRANT SELECT, INSERT, UPDATE ON products TO authenticated;
-- GRANT SELECT, INSERT, UPDATE ON pos_orders TO authenticated;
-- GRANT SELECT, INSERT ON pos_order_items TO authenticated;
