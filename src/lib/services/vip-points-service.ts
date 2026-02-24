import { getPointRuleByActionType, getActivePointRules } from '../db/repositories/vip-point-rules';
import {
  getVIPMembershipByUserId,
  createVIPMembership,
  addPointsToMembership
} from '../db/repositories/vip-memberships';
import { createPointsLogEntry } from '../db/repositories/vip-points-log';
import { updateUserNFCCardsMetadata } from '../db/repositories/nfc-cards';
import type { PointsSource, VIPTier } from '../db/types';
// Default tier thresholds (used as fallback)
export const DEFAULT_TIER_THRESHOLDS = {
  silver: 0,
  gold: 500,
  black: 1750
} as const;
// For backward compatibility, export TIER_THRESHOLDS as alias
export const TIER_THRESHOLDS = DEFAULT_TIER_THRESHOLDS;
// Cache for tier thresholds (refreshed periodically)
let cachedThresholds: { silver: number; gold: number; black: number } | null = null;
let lastThresholdFetch = 0;
const THRESHOLD_CACHE_TTL = 60000; // 1 minute cache
/**
 * Get tier thresholds from database (with caching)
 */
export async function getTierThresholds(): Promise<{ silver: number; gold: number; black: number }> {
  const now = Date.now();
  // Return cached value if still valid
  if (cachedThresholds && (now - lastThresholdFetch) < THRESHOLD_CACHE_TTL) {
    return cachedThresholds;
  }
  try {
    const rules = await getActivePointRules();
    const goldRule = rules.find(r => r.action_type === 'tier_threshold_gold');
    const blackRule = rules.find(r => r.action_type === 'tier_threshold_black');
    cachedThresholds = {
      silver: 0, // Silver always starts at 0
      gold: goldRule ? Math.round(goldRule.points_per_unit) : DEFAULT_TIER_THRESHOLDS.gold,
      black: blackRule ? Math.round(blackRule.points_per_unit) : DEFAULT_TIER_THRESHOLDS.black
    };
    lastThresholdFetch = now;
    return cachedThresholds;
  } catch (error) {
    console.error('Error fetching tier thresholds, using defaults:', error);
    return DEFAULT_TIER_THRESHOLDS;
  }
}
/**
 * Clear the tier thresholds cache (call after updating thresholds)
 */
export function clearTierThresholdsCache(): void {
  cachedThresholds = null;
  lastThresholdFetch = 0;
}
/**
 * Calculate tier based on points balance
 */
export function calculateTier(points: number): VIPTier {
  // Use cached thresholds synchronously for performance
  // This uses default values if cache is not populated
  const thresholds = cachedThresholds || DEFAULT_TIER_THRESHOLDS;
  if (points >= thresholds.black) return 'black';
  if (points >= thresholds.gold) return 'gold';
  return 'silver';
}
/**
 * Calculate tier based on points balance (async version with fresh thresholds)
 */
export async function calculateTierAsync(points: number): Promise<VIPTier> {
  const thresholds = await getTierThresholds();
  if (points >= thresholds.black) return 'black';
  if (points >= thresholds.gold) return 'gold';
  return 'silver';
}
/**
 * Get points required for next tier
 */
export function getPointsToNextTier(currentPoints: number, currentTier: VIPTier): number | null {
  const thresholds = cachedThresholds || DEFAULT_TIER_THRESHOLDS;
  if (currentTier === 'black') return null; // Already at max tier
  if (currentTier === 'gold') {
    return thresholds.black - currentPoints;
  }
  if (currentTier === 'silver') {
    return thresholds.gold - currentPoints;
  }
  return null;
}
/**
 * Get next tier name
 */
export function getNextTier(currentTier: VIPTier): VIPTier | null {
  if (currentTier === 'silver') return 'gold';
  if (currentTier === 'gold') return 'black';
  return null;
}
/**
 * Get tier color for UI
 */
export function getTierColor(tier: VIPTier): string {
  switch (tier) {
    case 'black': return 'bg-gray-900 text-white';
    case 'gold': return 'bg-gradient-to-r from-yellow-400 to-yellow-600 text-white';
    case 'silver': return 'bg-gradient-to-r from-gray-300 to-gray-400 text-gray-900';
  }
}
/**
 * Get tier badge styling
 */
export function getTierBadgeClass(tier: VIPTier): string {
  switch (tier) {
    case 'black': return 'bg-black text-white border-2 border-gray-700';
    case 'gold': return 'bg-gold text-white border-2 border-yellow-500';
    case 'silver': return 'bg-gray-400 text-white border-2 border-gray-500';
  }
}
/**
 * Award points to a user for an action
 */
export async function awardPoints(
  userId: string,
  source: PointsSource,
  amount: number,
  metadata?: Record<string, any>,
  refId?: string
): Promise<{ success: boolean; newBalance: number; newTier: VIPTier }> {
  try {
    // Ensure user has a VIP membership
    let membership = await getVIPMembershipByUserId(userId);
    if (!membership) {
      membership = await createVIPMembership(userId);
    }
    const oldTier = membership.tier;
    // Add points to membership (this triggers auto-tier upgrade)
    const updatedMembership = await addPointsToMembership(userId, amount);
    // If tier changed, update NFC card metadata
    if (oldTier !== updatedMembership.tier) {
      try {
        await updateUserNFCCardsMetadata(userId);
      } catch (error) {
        console.error('Error updating NFC cards metadata after tier change:', error);
        // Don't fail the points award if metadata update fails
      }
    }
    // Log the points transaction
    await createPointsLogEntry(
      userId,
      source,
      amount,
      updatedMembership.points_balance,
      metadata,
      refId
    );
    return {
      success: true,
      newBalance: updatedMembership.points_balance,
      newTier: updatedMembership.tier
    };
  } catch (error) {
    console.error('Error awarding points:', error);
    throw error;
  }
}
/**
 * Process event check-in and award points
 */
export async function processEventCheckin(
  userId: string,
  eventId?: string,
  checkinId?: string
): Promise<{ success: boolean; pointsAwarded: number; newBalance: number; newTier: VIPTier }> {
  // Get point rule for event check-in
  const rule = await getPointRuleByActionType('event_checkin');
  const pointsToAward = rule ? Math.floor(rule.points_per_unit) : 10; // Default 10 points
  const result = await awardPoints(
    userId,
    'event_checkin',
    pointsToAward,
    {
      event_id: eventId,
      checkin_id: checkinId,
      timestamp: new Date().toISOString()
    },
    checkinId
  );
  return {
    success: result.success,
    pointsAwarded: pointsToAward,
    newBalance: result.newBalance,
    newTier: result.newTier
  };
}
/**
 * Process consumption and award points
 */
export async function processConsumption(
  userId: string,
  amount: number,
  currency: string = 'EUR',
  consumptionId?: string
): Promise<{ success: boolean; pointsAwarded: number; newBalance: number; newTier: VIPTier }> {
  // Get point rule for consumption
  const rule = await getPointRuleByActionType('consumption');
  const pointsPerUnit = rule ? rule.points_per_unit : 0.333333; // Default 1 point per 3 euros
  // Calculate points (1 point per 3 euros by default)
  const pointsToAward = Math.floor(amount * pointsPerUnit);
  const result = await awardPoints(
    userId,
    'consumption',
    pointsToAward,
    {
      amount,
      currency,
      consumption_id: consumptionId,
      timestamp: new Date().toISOString()
    },
    consumptionId
  );
  return {
    success: result.success,
    pointsAwarded: pointsToAward,
    newBalance: result.newBalance,
    newTier: result.newTier
  };
}
/**
 * Manual points adjustment (admin only)
 */
export async function adjustPointsManually(
  userId: string,
  deltaPoints: number,
  reason: string,
  adminId?: string
): Promise<{ success: boolean; newBalance: number; newTier: VIPTier }> {
  const result = await awardPoints(
    userId,
    'manual_adjust',
    deltaPoints,
    {
      reason,
      adjusted_by: adminId,
      timestamp: new Date().toISOString()
    }
  );
  return {
    success: result.success,
    newBalance: result.newBalance,
    newTier: result.newTier
  };
}