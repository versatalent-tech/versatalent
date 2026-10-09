import { NextRequest } from 'next/server';
import { requireTeamPermission } from '@/lib/middleware/auth';
import { listClaims, type ClaimFilter } from '@/lib/db/repositories/loyalty';
import { ApiErrors, successResponse } from '@/lib/utils/api-response';
import { isValidUUID } from '@/lib/utils/validation';

export const dynamic = 'force-dynamic';

const FILTERS: ClaimFilter[] = ['open', 'redeemed', 'closed', 'all'];

// GET /api/admin/rewards/claims?filter=open&reward=<id>
export async function GET(request: NextRequest) {
  const auth = await requireTeamPermission('venue.manage');
  if ('response' in auth) return auth.response;
  const params = request.nextUrl.searchParams;
  const filter = FILTERS.includes(params.get('filter') as ClaimFilter) ? (params.get('filter') as ClaimFilter) : 'open';
  const reward = params.get('reward');
  try {
    return successResponse(await listClaims(filter, reward && isValidUUID(reward) ? reward : null));
  } catch (error) {
    console.error('Error loading claims:', error);
    return ApiErrors.ServerError('Failed to load');
  }
}
