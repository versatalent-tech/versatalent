-- Migration: Add inventory management system
-- This extends the existing POS system with stock tracking

-- Add low stock threshold to products (if not exists)
ALTER TABLE products
ADD COLUMN IF NOT EXISTS low_stock_threshold INTEGER DEFAULT 5;

-- Create inventory movements table for audit trail
CREATE TABLE IF NOT EXISTS inventory_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  change_amount INTEGER NOT NULL, -- positive for restock, negative for sale
  reason TEXT NOT NULL CHECK (reason IN ('pos_sale', 'manual_adjustment', 'restock', 'damage', 'theft', 'return')),
  related_order_id UUID REFERENCES pos_orders(id) ON DELETE SET NULL,
  staff_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_inventory_movements_product_id ON inventory_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_created_at ON inventory_movements(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_order_id ON inventory_movements(related_order_id);

-- Add VIP source for POS consumption
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_name = 'vip_consumptions_source_check'
  ) THEN
    ALTER TABLE vip_consumptions
    ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'manual'
    CHECK (source IN ('manual', 'event', 'pos'));
  END IF;
END $$;

-- Update VIP points log to support POS source
DO $$
BEGIN
  -- Check if the constraint exists and update it
  ALTER TABLE vip_points_log DROP CONSTRAINT IF EXISTS vip_points_log_source_check;
  ALTER TABLE vip_points_log
  ADD CONSTRAINT vip_points_log_source_check
  CHECK (source IN ('event_checkin', 'consumption', 'consumption_pos', 'manual_adjust', 'tier_bonus'));
END $$;

-- Comment
COMMENT ON TABLE inventory_movements IS 'Audit trail for all inventory changes including sales, restocks, and adjustments';
COMMENT ON COLUMN products.low_stock_threshold IS 'Alert threshold - when stock falls below this value, staff should be notified';
