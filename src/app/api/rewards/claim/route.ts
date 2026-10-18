import { NextRequest } from 'next/server';
import { z } from 'zod';
import { claimSchema } from '@/lib/loyalty/schemas';
import { claimReward, findPassMember, getClaim } from '@/lib/db/repositories/loyalty';
import { ApiErrors, successResponse } from '@/lib/utils/api-response';

export const dynamic = 'force-dynamic';

const schema = claimSchema.extend({ member: z.string().uuid() });

/**
 * POST /api/rewards/claim { member, reward_id, event_id?, guest_name? } -
 * a member claims a reward on their pass. Points are taken now and given
 * back if the claim is cancelled or not used in time. Not rate-limited:
 * points, stock and per-member limits already cap what can be claimed.
 */
export async function POST(request: NextRequest) {
  const parsed = schema.safeParse(await request.json().catch(() => undefined));
  if (!parsed.success) return ApiErrors.BadRequest('Choose a reward');
  const input = parsed.data;

  try {
    if (!(await findPassMember(input.member))) return ApiErrors.NotFound('Member');
    const result = await claimReward({
      userId: input.member,
      rewardId: input.reward_id,
      eventId: input.event_id ?? null,
      guestName: input.guest_name ?? null,
    });
    if ('error' in result) return ApiErrors.BadRequest(result.error);
    return successResponse(await getClaim(result.claimId), 'Claimed');
  } catch (error) {
    console.error('Reward claim error:', error);
    return ApiErrors.ServerError('Couldn’t claim that reward. Please try again.');
  }
}
