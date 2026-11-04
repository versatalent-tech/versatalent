import { NextRequest } from 'next/server';
import { z } from 'zod';
import { claimSchema } from '@/lib/loyalty/schemas';
import { claimReward, findPassMember, getClaim, hasOpenRequest } from '@/lib/db/repositories/loyalty';
import { ApiErrors, successResponse } from '@/lib/utils/api-response';

export const dynamic = 'force-dynamic';

const schema = claimSchema.extend({ member: z.string().uuid() });

/**
 * POST /api/rewards/claim { member, reward_id, event_id?, guest_name? } -
 * a member asks for a reward on their pass. The pass opens from a card's
 * link, which anyone could copy, so no points are taken here: staff tap the
 * member's card and confirm the request, and the points are taken then.
 * One open request per reward (and event) at a time.
 */
export async function POST(request: NextRequest) {
  const parsed = schema.safeParse(await request.json().catch(() => undefined));
  if (!parsed.success) return ApiErrors.BadRequest('Choose a reward');
  const input = parsed.data;

  try {
    if (!(await findPassMember(input.member))) return ApiErrors.NotFound('Member');
    if (await hasOpenRequest(input.member, input.reward_id, input.event_id ?? null)) {
      return ApiErrors.BadRequest('You’ve already asked for this. Show your card to staff to get it.');
    }
    const result = await claimReward({
      userId: input.member,
      rewardId: input.reward_id,
      eventId: input.event_id ?? null,
      guestName: input.guest_name ?? null,
      mode: 'request',
    });
    if ('error' in result) return ApiErrors.BadRequest(result.error);
    const claim = await getClaim(result.claimId);
    return successResponse(claim ? { ...claim, code: '' } : null, 'Requested');
  } catch (error) {
    console.error('Reward claim error:', error);
    return ApiErrors.ServerError('Couldn’t claim that reward. Please try again.');
  }
}
