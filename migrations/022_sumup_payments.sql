-- Migration 022: SumUp payments on the POS
--
-- Records how each order was paid and links SumUp transactions to orders.
-- The unique indexes stop one SumUp payment being used for two orders.

ALTER TABLE pos_orders ADD COLUMN IF NOT EXISTS payment_method TEXT;
ALTER TABLE pos_orders DROP CONSTRAINT IF EXISTS pos_orders_payment_method_check;
ALTER TABLE pos_orders ADD CONSTRAINT pos_orders_payment_method_check
  CHECK (payment_method IS NULL OR payment_method IN ('stripe', 'sumup_reader', 'sumup_app', 'cash'));

-- client_transaction_id returned when a checkout is sent to a Solo reader
ALTER TABLE pos_orders ADD COLUMN IF NOT EXISTS sumup_client_transaction_id TEXT;
-- SumUp transaction code (shown on SumUp receipts)
ALTER TABLE pos_orders ADD COLUMN IF NOT EXISTS sumup_transaction_code TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_pos_orders_sumup_client_tx
  ON pos_orders(sumup_client_transaction_id) WHERE sumup_client_transaction_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_pos_orders_sumup_tx_code
  ON pos_orders(sumup_transaction_code) WHERE sumup_transaction_code IS NOT NULL;

-- Existing card payments went through Stripe
UPDATE pos_orders SET payment_method = 'stripe'
  WHERE payment_method IS NULL AND stripe_payment_intent_id IS NOT NULL;
