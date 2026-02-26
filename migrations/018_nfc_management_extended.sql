-- Migration 018: Extended NFC Card Management
-- Adds status field and extends card types for comprehensive NFC management

-- Add status column to nfc_cards table
ALTER TABLE nfc_cards ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active';

-- Update status for existing cards based on is_active field
UPDATE nfc_cards SET status = CASE
  WHEN is_active = true THEN 'active'
  ELSE 'inactive'
END WHERE status IS NULL OR status = '';

-- Add index on status for faster queries
CREATE INDEX IF NOT EXISTS idx_nfc_cards_status ON nfc_cards(status);

-- Add index on card_uid for faster lookups
CREATE INDEX IF NOT EXISTS idx_nfc_cards_uid ON nfc_cards(card_uid);

-- Add index on user_id for user-based queries
CREATE INDEX IF NOT EXISTS idx_nfc_cards_user_id ON nfc_cards(user_id);

-- Create a table for NFC scan logs (for auditing and debugging)
CREATE TABLE IF NOT EXISTS nfc_scan_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  card_uid VARCHAR(100) NOT NULL,
  nfc_card_id UUID REFERENCES nfc_cards(id) ON DELETE SET NULL,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  scan_type VARCHAR(50) NOT NULL DEFAULT 'read', -- read, write, error
  reader_device VARCHAR(100), -- e.g., 'ACR122U'
  success BOOLEAN DEFAULT true,
  error_message TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for scan logs
CREATE INDEX IF NOT EXISTS idx_nfc_scan_logs_card_uid ON nfc_scan_logs(card_uid);
CREATE INDEX IF NOT EXISTS idx_nfc_scan_logs_created ON nfc_scan_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_nfc_scan_logs_user_id ON nfc_scan_logs(user_id);

-- Comment on table for documentation
COMMENT ON TABLE nfc_scan_logs IS 'Audit log for NFC card scans';
COMMENT ON COLUMN nfc_cards.status IS 'Card status: active, inactive, or blocked';
