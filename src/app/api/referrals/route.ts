import { NextRequest } from 'next/server';
import { findPassMember } from '@/lib/db/repositories/loyalty';
import { getMemberReferralSummary } from '@/lib/db/repositories/referrals';
import { ApiErrors, successResponse } from '@/lib/utils/api-response';
import { isValidUUID } from '@/lib/utils/validation';

export const dynamic = 'force-dynamic';

// GET /api/referrals?member=<member id> - the member's code, share link and results (pass page)
export async function GET(request: NextRequest) {
  const memberId = request.nextUrl.searchParams.get('member') ?? '';
  if (!isValidUUID(memberId)) return ApiErrors.NotFound('Member');
  try {
    if (!(await findPassMember(memberId))) return ApiErrors.NotFound('Member');
    return successResponse(await getMemberReferralSummary(memberId, request.nextUrl.origin));
  } catch (error) {
    console.error('Referral summary error:', error);
    return ApiErrors.ServerError('Couldn’t load your referrals');
  }
}
