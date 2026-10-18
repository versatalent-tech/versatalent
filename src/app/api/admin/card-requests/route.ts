import { NextRequest } from 'next/server';
import { requireTeamPermission } from '@/lib/middleware/auth';
import { countCardRequests, getProgrammeSettings, listCardRequests, purgeStaleApplications } from '@/lib/db/repositories/membership';
import { CARD_REQUEST_STATUSES, type CardRequestStatus } from '@/lib/membership/types';
import { ApiErrors, successResponse } from '@/lib/utils/api-response';

export const dynamic = 'force-dynamic';

// GET /api/admin/card-requests?status=open|all|<status> - membership cards to post
export async function GET(request: NextRequest) {
  const auth = await requireTeamPermission('venue.manage');
  if ('response' in auth) return auth.response;
  const requested = request.nextUrl.searchParams.get('status') ?? 'open';
  const status = requested === 'all' || requested === 'open' || requested in CARD_REQUEST_STATUSES ? requested : 'open';

  try {
    // Housekeeping promised in the privacy notice
    const purged = await purgeStaleApplications().catch(() => 0);
    if (purged > 0) console.log(`[membership] Deleted ${purged} unpaid application(s) older than 6 months`);

    const [requests, counts, settings] = await Promise.all([
      listCardRequests(status as CardRequestStatus | 'open' | 'all'),
      countCardRequests(),
      getProgrammeSettings(),
    ]);
    return successResponse({ requests, counts, settings });
  } catch (error) {
    console.error('Error listing card requests:', error);
    return ApiErrors.ServerError('Failed to load card requests');
  }
}
