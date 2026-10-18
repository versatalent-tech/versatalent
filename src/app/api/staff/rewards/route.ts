import { NextRequest } from 'next/server';
import { z } from 'zod';
import { sql } from '@/lib/db/client';
import { getCurrentSession } from '@/lib/middleware/auth';
import { claimSchema } from '@/lib/loyalty/schemas';
import {
  claimReward,
  closeClaim,
  expireClaims,
  getClaim,
  getClaimByCode,
  getRewardsForMember,
  listMemberClaims,
} from '@/lib/db/repositories/loyalty';
import { normaliseClaimCode, type StaffRewardLookup } from '@/lib/loyalty/types';
import { logAudit } from '@/lib/db/repositories/audit-log';
import { ApiErrors, successResponse } from '@/lib/utils/api-response';

export const dynamic = 'force-dynamic';

async function lookup(userId: string): Promise<StaffRewardLookup | null> {
  const member = await sql`SELECT id, name FROM users WHERE id = ${userId} AND role IN ('vip', 'artist') LIMIT 1`;
  if (!member[0]) return null;
  const [view, claims] = await Promise.all([getRewardsForMember(userId), listMemberClaims(userId)]);
  return {
    member: { id: member[0].id, name: member[0].name, tier: view.tier, reward_balance: view.balance, founding: view.founding },
    claims: claims.filter((c) => c.status === 'reserved'),
    rewards: view.rewards,
    rewards_open: view.settings.rewards_open,
  };
}

/**
 * GET /api/staff/rewards?code=ABCD-2345 or ?card_uid=... - at the door or
 * till: the member, their claims ready to use and rewards they can have.
 */
export async function GET(request: NextRequest) {
  const session = await getCurrentSession();
  if (!session) return ApiErrors.Unauthorized('Staff sign-in required');
  const params = request.nextUrl.searchParams;

  try {
    await expireClaims();
    let userId: string | null = null;
    let claimNote: string | null = null;
    const code = normaliseClaimCode(params.get('code') ?? '');
    const cardUid = (params.get('card_uid') ?? '').trim().toUpperCase();

    if (code) {
      const claim = await getClaimByCode(code);
      if (!claim) return ApiErrors.NotFound('Claim code');
      userId = claim.member.id;
      if (claim.status !== 'reserved') {
        claimNote =
          claim.status === 'redeemed'
            ? `Code ${code} was already used${claim.redeemed_at ? ` on ${new Date(claim.redeemed_at).toLocaleString('en-GB', { timeZone: 'Europe/London', dateStyle: 'medium', timeStyle: 'short' })}` : ''}.`
            : `Code ${code} is ${claim.status}.`;
      }
    } else if (cardUid) {
      const card = await sql`
        SELECT user_id, is_active, status FROM nfc_cards WHERE upper(card_uid) = ${cardUid} LIMIT 1
      `;
      if (!card[0]?.user_id) return ApiErrors.NotFound('Card');
      if (!card[0].is_active || card[0].status === 'blocked') return ApiErrors.BadRequest('This card has been deactivated');
      userId = card[0].user_id;
    } else {
      return ApiErrors.BadRequest('Enter a claim code or tap a card');
    }

    const result = await lookup(userId!);
    if (!result) return ApiErrors.NotFound('Member');
    return successResponse({ ...result, note: claimNote });
  } catch (error) {
    console.error('Staff rewards lookup error:', error);
    return ApiErrors.ServerError('Lookup failed');
  }
}

const actionSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('redeem'), claim_id: z.string().uuid() }),
  z.object({ action: z.literal('cancel'), claim_id: z.string().uuid(), reason: z.string().trim().max(200).optional() }),
  claimSchema.extend({ action: z.literal('give'), user_id: z.string().uuid() }),
]);

/**
 * POST /api/staff/rewards
 * - redeem: mark a claim used (a second scan is refused)
 * - give: claim and use a reward now for the member in front of you
 * - cancel: cancel a claim; its points go back
 */
export async function POST(request: NextRequest) {
  const session = await getCurrentSession();
  if (!session) return ApiErrors.Unauthorized('Staff sign-in required');
  const parsed = actionSchema.safeParse(await request.json().catch(() => undefined));
  if (!parsed.success) return ApiErrors.BadRequest('Invalid request');
  const input = parsed.data;
  const actor = { userId: session.userId, name: session.name };

  try {
    if (input.action === 'give') {
      const result = await claimReward({
        userId: input.user_id,
        rewardId: input.reward_id,
        eventId: input.event_id ?? null,
        guestName: input.guest_name ?? null,
        actorId: session.userId ?? null,
        redeemNow: true,
      });
      if ('error' in result) return ApiErrors.BadRequest(result.error);
      const claim = await getClaim(result.claimId);
      await logAudit(actor, 'give_reward', 'reward_claim', result.claimId, { after: { member: input.user_id, reward: claim?.reward_title } });
      return successResponse({ claim, lookup: await lookup(input.user_id) }, `${claim?.reward_title} given`);
    }

    const result = await closeClaim(input.claim_id, input.action === 'redeem' ? 'redeemed' : 'cancelled', session.userId ?? null,
      input.action === 'cancel' ? input.reason || 'Cancelled by staff' : null);
    const claim = await getClaim(input.claim_id);
    if ('error' in result) return ApiErrors.BadRequest(result.error);
    await logAudit(actor, input.action === 'redeem' ? 'redeem_reward' : 'cancel_reward', 'reward_claim', input.claim_id, {
      after: { status: result.status, reward: claim?.reward_title },
    });
    return successResponse({ claim, lookup: claim ? await lookup(claim.member.id) : null }, input.action === 'redeem' ? 'Used' : 'Cancelled');
  } catch (error) {
    console.error('Staff rewards action error:', error);
    return ApiErrors.ServerError('That didn’t work. Please try again.');
  }
}
