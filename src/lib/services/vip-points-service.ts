import { getPointRuleByActionType } from '../db/repositories/vip-point-rules';
import { randomUUID } from 'crypto';
import {
  getVIPMembershipByUserId,
  createVIPMembership,
  setMembershipTier,
  getMembershipsDueForNewYear,
} from '../db/repositories/vip-memberships';
import { getLoyaltySettings, postPoints, startMembershipYear } from '../db/repositories/loyalty';
import type { Ledger } from '../loyalty/types';
import { qualifyReferral } from '../db/repositories/referrals';
import { updateUserNFCCardsMetadata } from '../db/repositories/nfc-cards';
import { getUserById } from '../db/repositories/users';
import { sql } from '../db/client';
import { POS_CURRENCY } from '../utils/formatting';
import { currentTier, getTierSettings, tierAfterYearsEnded } from './vip-tiers';
import type { PointsSource, VIPMembership, VIPTier } from '../db/types';

/** Roles whose membership earns points and member discounts */
export const MEMBER_ROLES = ['vip', 'artist'];

/**
 * Move memberships whose year has ended into their new year, setting the
 * tier secured for it (see vip-tiers). Runs lazily before memberships are
 * read or changed; pass a userId to check just one member.
 */
export async function rollOverMembershipYears(userId?: string): Promise<void> {
  const due = await getMembershipsDueForNewYear(userId);
  if (due.length === 0) return;

  const { thresholds } = await getTierSettings();
  for (const m of due) {
    const tier = tierAfterYearsEnded(m.base_tier, m.status_points, m.years_ended, thresholds);
    // Status points go back to zero as a ledger entry (reward points carry on)
    const moved = await startMembershipYear(m.user_id, m.year_start, m.years_ended, tier);
    if (moved && tier !== m.tier) {
      await updateUserNFCCardsMetadata(m.user_id).catch((error) =>
        console.error('Error updating NFC cards metadata after new membership year:', error)
      );
    }
  }
}

/** A member's membership, moved into the current membership year */
export async function getCurrentMembership(userId: string): Promise<VIPMembership | null> {
  await rollOverMembershipYears(userId);
  return getVIPMembershipByUserId(userId);
}

/**
 * The discount a customer gets at the till: VIP members (and artists) with an
 * active membership get their tier's discount. Null when there isn't one.
 */
export async function getMemberDiscount(userId: string): Promise<{ tier: VIPTier; percent: number } | null> {
  const user = await getUserById(userId);
  if (!user || !MEMBER_ROLES.includes(user.role)) return null;

  const membership = await getCurrentMembership(userId);
  if (!membership || membership.status !== 'active') return null;

  const { discounts } = await getTierSettings();
  const percent = Math.min(100, Math.max(0, discounts[membership.tier] ?? 0));
  return percent > 0 ? { tier: membership.tier, percent } : null;
}

/** Whole points from an amount times a rate, ignoring float noise (30 x 1/3 = 10) */
function wholePoints(value: number): number {
  return Math.floor(Math.round(value * 1000) / 1000);
}

/**
 * Award points for an action. Status points (towards the tier) get the full
 * amount; reward points (to spend) get the configured share of it. With
 * applyTierMultiplier, the amount is multiplied by the member's tier rate
 * (e.g. Gold 1.5x). `sourceKey` makes the award happen at most once.
 */
export async function awardPoints(
  userId: string,
  source: PointsSource,
  amount: number,
  metadata: Record<string, any> | undefined,
  refId: string | undefined,
  options: { applyTierMultiplier?: boolean; sourceKey: string }
): Promise<{ success: boolean; pointsAwarded: number; newBalance: number; newTier: VIPTier }> {
  let membership = await getCurrentMembership(userId);
  if (!membership) {
    membership = await createVIPMembership(userId);
  }
  const [settings, loyalty] = await Promise.all([getTierSettings(), getLoyaltySettings()]);

  const multiplier = options.applyTierMultiplier ? settings.multipliers[membership.tier] ?? 1 : 1;
  const points = multiplier === 1 ? amount : wholePoints(amount * multiplier);
  const rewardPoints = wholePoints((points * loyalty.reward_earn_percent) / 100);
  const details = multiplier === 1 ? metadata : { ...metadata, base_points: amount, tier_multiplier: multiplier, tier: membership.tier };

  const status = await postPoints({ userId, ledger: 'status', delta: points, source, sourceKey: options.sourceKey, refId, metadata: details });
  const reward = await postPoints({ userId, ledger: 'reward', delta: rewardPoints, source, sourceKey: options.sourceKey, refId, metadata: details });

  // Moving up happens straight away; within the year the tier never drops
  // below the one secured for it
  const updated = await getVIPMembershipByUserId(userId);
  const newTier = currentTier(updated!.base_tier, updated!.status_points, settings.thresholds);
  if (newTier !== updated!.tier) {
    await setMembershipTier(userId, newTier);
    try {
      await updateUserNFCCardsMetadata(userId);
    } catch (error) {
      console.error('Error updating NFC cards metadata after tier change:', error);
      // Don't fail the points award if metadata update fails
    }
  }

  return {
    success: true,
    pointsAwarded: status.duplicate ? 0 : status.applied,
    newBalance: reward.balance,
    newTier,
  };
}

/**
 * Claim the check-in award for this member. Returns the award key, or null
 * if points were already awarded for it.
 *
 * A check-in to an event happening today (UK time) is keyed to that event;
 * anything else (no event, or a past/future event) is keyed to the day.
 * The (user_id, award_key) primary key makes the claim atomic.
 */
async function claimCheckinAward(
  userId: string,
  eventId?: string | null,
  checkinId?: string
): Promise<string | null> {
  const rows = await sql`
    INSERT INTO vip_checkin_awards (user_id, award_key, checkin_id)
    SELECT
      ${userId},
      COALESCE(
        (
          SELECT 'event:' || id
          FROM nfc_events
          WHERE id = ${eventId || null}::uuid
            AND (date AT TIME ZONE 'Europe/London')::date = (NOW() AT TIME ZONE 'Europe/London')::date
        ),
        'day:' || (NOW() AT TIME ZONE 'Europe/London')::date
      ),
      ${checkinId || null}::uuid
    ON CONFLICT (user_id, award_key) DO NOTHING
    RETURNING award_key
  `;
  return rows.length > 0 ? rows[0].award_key : null;
}

async function releaseCheckinAward(userId: string, awardKey: string) {
  await sql`DELETE FROM vip_checkin_awards WHERE user_id = ${userId} AND award_key = ${awardKey}`;
}

/**
 * Process event check-in and award points (at most once per event today,
 * or once per day when there's no event today)
 */
export async function processEventCheckin(
  userId: string,
  eventId?: string,
  checkinId?: string
): Promise<{ success: boolean; pointsAwarded: number; alreadyAwarded: boolean; newBalance: number; newTier: VIPTier }> {
  const awardKey = await claimCheckinAward(userId, eventId, checkinId);

  if (!awardKey) {
    const membership = await getCurrentMembership(userId);
    return {
      success: true,
      pointsAwarded: 0,
      alreadyAwarded: true,
      newBalance: membership?.points_balance ?? 0,
      newTier: membership?.tier ?? 'silver',
    };
  }

  // Get point rule for event check-in
  const rule = await getPointRuleByActionType('event_checkin');
  const pointsToAward = rule ? Math.floor(rule.points_per_unit) : 10; // Default 10 points

  try {
    const result = await awardPoints(
      userId,
      'event_checkin',
      pointsToAward,
      {
        event_id: eventId,
        checkin_id: checkinId,
        award_key: awardKey,
        timestamp: new Date().toISOString()
      },
      checkinId,
      { applyTierMultiplier: true, sourceKey: `checkin:${userId}:${awardKey}` }
    );

    // A staff-verified visit can complete the member's referral
    await qualifyReferral(userId, 'checkin').catch((error) => console.error('Referral qualification failed:', error));

    return {
      success: result.success,
      pointsAwarded: result.pointsAwarded,
      alreadyAwarded: false,
      newBalance: result.newBalance,
      newTier: result.newTier
    };
  } catch (error) {
    // Let a later check-in try again
    await releaseCheckinAward(userId, awardKey);
    throw error;
  }
}

/**
 * Process consumption and award points
 */
export async function processConsumption(
  userId: string,
  amount: number,
  currency: string = POS_CURRENCY,
  consumptionId?: string,
  orderId?: string
): Promise<{ success: boolean; pointsAwarded: number; newBalance: number; newTier: VIPTier }> {
  // Get point rule for consumption
  const rule = await getPointRuleByActionType('consumption');
  const pointsPerUnit = rule ? rule.points_per_unit : 1 / 3; // Default 1 point per £3
  // Calculate points (1 point per 3 euros by default)
  const pointsToAward = wholePoints(amount * pointsPerUnit);
  const result = await awardPoints(
    userId,
    'consumption',
    pointsToAward,
    {
      amount,
      currency,
      consumption_id: consumptionId,
      order_id: orderId,
      timestamp: new Date().toISOString()
    },
    consumptionId,
    {
      applyTierMultiplier: true,
      // A till order earns once; a consumption entered by hand earns once
      sourceKey: orderId ? `order:${orderId}` : `consumption:${consumptionId ?? randomUUID()}`,
    }
  );
  return {
    success: result.success,
    pointsAwarded: result.pointsAwarded,
    newBalance: result.newBalance,
    newTier: result.newTier
  };
}
/**
 * Manual points adjustment (admin only), on one ledger. Never takes a
 * balance below zero. Status changes can move the tier up (a tier is never
 * lost mid-year).
 */
export async function adjustPointsManually(
  userId: string,
  deltaPoints: number,
  reason: string,
  adminId?: string,
  ledger: Ledger = 'reward'
): Promise<{ success: boolean; applied: number; newBalance: number; newTier: VIPTier }> {
  if (!(await getCurrentMembership(userId))) await createVIPMembership(userId);
  const result = await postPoints({
    userId,
    ledger,
    delta: deltaPoints,
    source: 'manual_adjust',
    sourceKey: `manual:${randomUUID()}`,
    metadata: { reason, adjusted_by: adminId },
    actorId: adminId ?? null,
    mode: 'clamp',
  });

  const settings = await getTierSettings();
  const updated = await getVIPMembershipByUserId(userId);
  const newTier = currentTier(updated!.base_tier, updated!.status_points, settings.thresholds);
  if (newTier !== updated!.tier) {
    await setMembershipTier(userId, newTier);
    await updateUserNFCCardsMetadata(userId).catch((error) => console.error('Error updating NFC cards metadata:', error));
  }
  return { success: true, applied: result.applied, newBalance: result.balance, newTier: updated!.tier === newTier ? updated!.tier : newTier };
}
