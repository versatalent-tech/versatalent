-- Migration 021: switch the POS to GBP
--
-- New orders, products and VIP spend default to GBP. Existing orders and
-- VIP spend records keep their original currency (EUR) so history stays
-- accurate. Product prices keep the same amounts; review them in
-- Admin > POS > Products.

ALTER TABLE pos_orders ALTER COLUMN currency SET DEFAULT 'GBP';
ALTER TABLE products ALTER COLUMN currency SET DEFAULT 'GBP';
ALTER TABLE vip_consumptions ALTER COLUMN currency SET DEFAULT 'GBP';

-- Products are priced in the POS currency
UPDATE products SET currency = 'GBP' WHERE currency <> 'GBP';

-- Purchase points rule: "1 point per £X"
UPDATE vip_point_rules SET unit = 'GBP' WHERE action_type = 'consumption' AND unit = 'EUR';
