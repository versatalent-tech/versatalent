/**
 * Loads the VIP tier settings (VIP → Point Rules) and re-exports the tier
 * rules from lib/vip-tier-rules.
 */
import { getActivePointRules } from '../db/repositories/vip-point-rules';
import { DEFAULT_TIER_SETTINGS, type TierSettings } from '../vip-tier-rules';

export * from '../vip-tier-rules';

const CACHE_TTL_MS = 60_000;
let cached: { settings: TierSettings; at: number } | null = null;

/** Tier settings from VIP → Point Rules (cached for a minute) */
export async function getTierSettings(): Promise<TierSettings> {
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) return cached.settings;

  const rules = await getActivePointRules();
  const value = (actionType: string, fallback: number) => {
    const rule = rules.find((r) => r.action_type === actionType);
    return rule && Number.isFinite(rule.points_per_unit) ? rule.points_per_unit : fallback;
  };
  const d = DEFAULT_TIER_SETTINGS;

  const settings: TierSettings = {
    thresholds: {
      gold: Math.round(value('tier_threshold_gold', d.thresholds.gold)),
      black: Math.round(value('tier_threshold_black', d.thresholds.black)),
    },
    discounts: {
      silver: value('tier_discount_silver', d.discounts.silver),
      gold: value('tier_discount_gold', d.discounts.gold),
      black: value('tier_discount_black', d.discounts.black),
    },
    multipliers: {
      silver: 1,
      gold: value('tier_multiplier_gold', d.multipliers.gold),
      black: value('tier_multiplier_black', d.multipliers.black),
    },
  };

  cached = { settings, at: Date.now() };
  return settings;
}

/** Call after saving point rules so changes apply straight away */
export function clearTierSettingsCache() {
  cached = null;
}
