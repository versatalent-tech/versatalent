-- Migration 023: VIP yearly requalification, tier multipliers and member discounts
--
-- Tiers no longer follow the points balance. Each member has a membership
-- year running from the anniversary of the day they joined:
--   status_points  points earned in the current membership year
--   base_tier      the tier secured for the whole current year
--   tier           base_tier, raised straight away when status_points reach
--                  a higher threshold
-- At each anniversary the new base_tier is what the year's points qualify
-- for, but at most one tier below the tier held (handled in the app).
--
-- Till orders record the member discount; products can be excluded from it.
-- Discount rates, points multipliers and thresholds live in vip_point_rules.

-- ---------------------------------------------------------------------------
-- Membership year
-- ---------------------------------------------------------------------------

ALTER TABLE vip_memberships ADD COLUMN IF NOT EXISTS year_start DATE;
ALTER TABLE vip_memberships ADD COLUMN IF NOT EXISTS base_tier TEXT;
ALTER TABLE vip_memberships ADD COLUMN IF NOT EXISTS status_points INTEGER NOT NULL DEFAULT 0;

-- The year starts on the latest anniversary of the member joining (UK date)
UPDATE vip_memberships m
SET year_start = (j.joined + make_interval(years => EXTRACT(YEAR FROM age((NOW() AT TIME ZONE 'Europe/London')::date, j.joined))::int))::date
FROM (
  SELECT vm.user_id, (COALESCE(u.created_at, vm.created_at) AT TIME ZONE 'Europe/London')::date AS joined
  FROM vip_memberships vm
  LEFT JOIN users u ON u.id = vm.user_id
) j
WHERE m.user_id = j.user_id AND m.year_start IS NULL;

-- Existing members keep their current tier for the rest of this year
UPDATE vip_memberships SET base_tier = tier WHERE base_tier IS NULL;

-- Points already earned this membership year count towards requalifying
UPDATE vip_memberships m
SET status_points = GREATEST(0, COALESCE((
  SELECT SUM(l.delta_points)
  FROM vip_points_log l
  WHERE l.user_id = m.user_id
    AND (l.created_at AT TIME ZONE 'Europe/London')::date >= m.year_start
), 0))::int;

ALTER TABLE vip_memberships ALTER COLUMN year_start SET DEFAULT CURRENT_DATE;
ALTER TABLE vip_memberships ALTER COLUMN year_start SET NOT NULL;
ALTER TABLE vip_memberships ALTER COLUMN base_tier SET DEFAULT 'silver';
ALTER TABLE vip_memberships ALTER COLUMN base_tier SET NOT NULL;
ALTER TABLE vip_memberships DROP CONSTRAINT IF EXISTS vip_memberships_base_tier_check;
ALTER TABLE vip_memberships ADD CONSTRAINT vip_memberships_base_tier_check
  CHECK (base_tier IN ('silver', 'gold', 'black'));

-- The tier used to follow the points balance with fixed thresholds (500 /
-- 1750); the app now sets it from status points and the admin thresholds
DROP TRIGGER IF EXISTS trigger_auto_upgrade_vip_tier ON vip_memberships;
DROP FUNCTION IF EXISTS auto_upgrade_vip_tier();
DROP FUNCTION IF EXISTS calculate_vip_tier(INTEGER);

COMMENT ON COLUMN vip_memberships.year_start IS 'Start of the current membership year (anniversary of joining)';
COMMENT ON COLUMN vip_memberships.base_tier IS 'Tier secured for the whole current membership year';
COMMENT ON COLUMN vip_memberships.status_points IS 'Points earned in the current membership year';

-- ---------------------------------------------------------------------------
-- Member discounts at the till
-- ---------------------------------------------------------------------------

ALTER TABLE products ADD COLUMN IF NOT EXISTS member_discount_excluded BOOLEAN NOT NULL DEFAULT FALSE;

-- total_cents stays the amount charged; subtotal_cents is before the discount
ALTER TABLE pos_orders ADD COLUMN IF NOT EXISTS subtotal_cents INTEGER;
ALTER TABLE pos_orders ADD COLUMN IF NOT EXISTS discount_cents INTEGER NOT NULL DEFAULT 0;
ALTER TABLE pos_orders ADD COLUMN IF NOT EXISTS discount_percent NUMERIC(5, 2) NOT NULL DEFAULT 0;
ALTER TABLE pos_orders ADD COLUMN IF NOT EXISTS discount_tier TEXT;
UPDATE pos_orders SET subtotal_cents = total_cents WHERE subtotal_cents IS NULL;

-- ---------------------------------------------------------------------------
-- Settings (vip_point_rules): thresholds, discounts and multipliers
-- ---------------------------------------------------------------------------

-- Two decimal places stored "1 point per £3" as 0.33, so £30 earned 9 points
ALTER TABLE vip_point_rules ALTER COLUMN points_per_unit TYPE NUMERIC(12, 6);
UPDATE vip_point_rules SET points_per_unit = 1.0 / 3
  WHERE action_type = 'consumption' AND points_per_unit = 0.33;

INSERT INTO vip_point_rules (action_type, points_per_unit, unit, is_active) VALUES
  ('tier_threshold_gold', 500, 'points', TRUE),
  ('tier_threshold_black', 1750, 'points', TRUE),
  ('tier_discount_silver', 0, 'percent', TRUE),
  ('tier_discount_gold', 10, 'percent', TRUE),
  ('tier_discount_black', 20, 'percent', TRUE),
  ('tier_multiplier_gold', 1.5, 'multiplier', TRUE),
  ('tier_multiplier_black', 2, 'multiplier', TRUE)
ON CONFLICT (action_type) DO NOTHING;

-- Never awarded by anything
DELETE FROM vip_point_rules WHERE action_type = 'tier_bonus';
