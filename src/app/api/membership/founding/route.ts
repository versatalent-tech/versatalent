import { NextRequest } from 'next/server';
import { sql } from '@/lib/db/client';
import { getFoundingSettings, getMemberFoundingStatus } from '@/lib/db/repositories/founding';
import { ApiErrors, successResponse } from '@/lib/utils/api-response';
import { isValidUUID } from '@/lib/utils/validation';

export const dynamic = 'force-dynamic';

/**
 * GET /api/membership/founding?member=<member id> - the member's pass page:
 * their Founding Membership (number, dates, benefits) or the offer.
 * Like the rest of the pass page, the unguessable member ID is the key.
 */
export async function GET(request: NextRequest) {
  const memberId = request.nextUrl.searchParams.get('member') ?? '';
  if (!isValidUUID(memberId)) return ApiErrors.NotFound('Member');

  try {
    const member = await sql`SELECT id FROM users WHERE id = ${memberId} AND role IN ('vip', 'artist') AND is_active LIMIT 1`;
    if (member.length === 0) return ApiErrors.NotFound('Member');
    return successResponse(await getMemberFoundingStatus(memberId, await getFoundingSettings()));
  } catch (error) {
    console.error('Founding status error:', error);
    return ApiErrors.ServerError('Couldn’t load your membership');
  }
}
