import { NextRequest } from 'next/server';
import { findPassMember, getMemberRewards } from '@/lib/db/repositories/loyalty';
import { ApiErrors, successResponse } from '@/lib/utils/api-response';
import { isValidUUID } from '@/lib/utils/validation';

export const dynamic = 'force-dynamic';

/**
 * GET /api/rewards?member=<member id> - the member's pass page: reward
 * points, rewards they can claim (or why not yet) and their claims.
 */
export async function GET(request: NextRequest) {
  const memberId = request.nextUrl.searchParams.get('member') ?? '';
  if (!isValidUUID(memberId)) return ApiErrors.NotFound('Member');
  try {
    if (!(await findPassMember(memberId))) return ApiErrors.NotFound('Member');
    return successResponse(await getMemberRewards(memberId));
  } catch (error) {
    console.error('Rewards load error:', error);
    return ApiErrors.ServerError('Couldn’t load rewards');
  }
}
