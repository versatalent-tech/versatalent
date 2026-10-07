/**
 * VIP tier rules: yearly requalification, points multipliers and member
 * discounts.
 *
 * Each member's year runs from the anniversary of the day they joined.
 * - status_points: points earned in the current membership year
 * - base_tier: the tier secured for the whole current year
 * - tier: base_tier, raised straight away when status_points reach a higher
 *   threshold; a tier reached this way is also kept for all of next year
 * At each anniversary the new base tier is what the year's points qualify
 * for, but never more than one tier below the tier held.
 *
 * Pure rules, safe to use in the browser. The admin settings are loaded by
 * getTierSettings in lib/services/vip-tiers.ts.
 */
import type { VIPTier } from './db/types';

export const TIERS: VIPTier[] = ['silver', 'gold', 'black'];

export interface TierSettings {
  /** Status points needed in a membership year */
  thresholds: { gold: number; black: number };
  /** Percent off eligible till items */
  discounts: Record<VIPTier, number>;
  /** Points multiplier for check-ins and purchases */
  multipliers: Record<VIPTier, number>;
}

export const DEFAULT_TIER_SETTINGS: TierSettings = {
  thresholds: { gold: 500, black: 1750 },
  discounts: { silver: 0, gold: 10, black: 20 },
  multipliers: { silver: 1, gold: 1.5, black: 2 },
};

const rank = (tier: VIPTier) => TIERS.indexOf(tier);

export function higherTier(a: VIPTier, b: VIPTier): VIPTier {
  return rank(a) >= rank(b) ? a : b;
}

export function tierBelow(tier: VIPTier): VIPTier {
  return TIERS[Math.max(0, rank(tier) - 1)];
}

export function tierAbove(tier: VIPTier): VIPTier | null {
  return TIERS[rank(tier) + 1] ?? null;
}

/** The tier a year's status points qualify for */
export function qualifiedTier(statusPoints: number, thresholds: TierSettings['thresholds']): VIPTier {
  if (statusPoints >= thresholds.black) return 'black';
  if (statusPoints >= thresholds.gold) return 'gold';
  return 'silver';
}

export function tierThreshold(tier: VIPTier, thresholds: TierSettings['thresholds']): number {
  return tier === 'black' ? thresholds.black : tier === 'gold' ? thresholds.gold : 0;
}

/** Current tier: the secured tier, or higher if this year's points reach it */
export function currentTier(baseTier: VIPTier, statusPoints: number, thresholds: TierSettings['thresholds']): VIPTier {
  return higherTier(baseTier, qualifiedTier(statusPoints, thresholds));
}

/**
 * The secured tier after `yearsEnded` membership years have ended. The first
 * ended year is judged on its status points; any further years passed with no
 * points, so each drops one more tier.
 */
export function tierAfterYearsEnded(
  baseTier: VIPTier,
  statusPoints: number,
  yearsEnded: number,
  thresholds: TierSettings['thresholds']
): VIPTier {
  if (yearsEnded <= 0) return baseTier;
  const earned = qualifiedTier(statusPoints, thresholds);
  const held = higherTier(baseTier, earned);
  let tier = higherTier(earned, tierBelow(held));
  for (let year = 1; year < yearsEnded; year++) {
    tier = tierBelow(tier);
  }
  return tier;
}

/** Add whole years to a YYYY-MM-DD date (29 Feb becomes 28 Feb) */
export function addYears(date: string, years: number): string {
  const [y, m, d] = date.slice(0, 10).split('-').map(Number);
  const target = new Date(Date.UTC(y + years, m - 1, d));
  if (target.getUTCMonth() !== m - 1) target.setUTCDate(0);
  return target.toISOString().slice(0, 10);
}

export interface TierProgress {
  tier: VIPTier;
  /** Last day of the current membership year */
  year_ends: string;
  status_points: number;
  /** The current tier is held until this date (inclusive) */
  tier_secured_until: string;
  /** Points still needed this year to keep the current tier, or 0 */
  points_to_keep: number;
  next_tier: VIPTier | null;
  points_to_next: number | null;
  discount_percent: number;
  points_multiplier: number;
}

/** What a member needs to know about their tier, for the VIP page */
export function getTierProgress(
  membership: { tier: VIPTier; base_tier: VIPTier; status_points: number; year_start: string },
  settings: TierSettings
): TierProgress {
  const { thresholds } = settings;
  const tier = membership.tier;
  const nextYearStart = addYears(String(membership.year_start), 1);
  const yearEnds = addDays(nextYearStart, -1);
  const earned = qualifiedTier(membership.status_points, thresholds);
  const requalified = rank(earned) >= rank(tier);
  const next = tierAbove(tier);

  return {
    tier,
    year_ends: yearEnds,
    status_points: membership.status_points,
    tier_secured_until: requalified ? addDays(addYears(nextYearStart, 1), -1) : yearEnds,
    points_to_keep: requalified ? 0 : tierThreshold(tier, thresholds) - membership.status_points,
    next_tier: next,
    points_to_next: next ? Math.max(0, tierThreshold(next, thresholds) - membership.status_points) : null,
    discount_percent: settings.discounts[tier],
    points_multiplier: settings.multipliers[tier],
  };
}

function addDays(date: string, days: number): string {
  const [y, m, d] = date.slice(0, 10).split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}
