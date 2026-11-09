import { NextRequest } from 'next/server';
import { requireTeamPermission } from '@/lib/middleware/auth';
import { listOwedStaffShares, listRecentStaffShares } from '@/lib/db/repositories/staff-shares';
import { ApiErrors, successResponse } from '@/lib/utils/api-response';

export const dynamic = 'force-dynamic';

// GET /api/payouts/team?view=owed|paid - managers' and road managers' shares still owed, or recently paid (admins only)
export async function GET(request: NextRequest) {
  const auth = await requireTeamPermission('payouts.team');
  if ('response' in auth) return auth.response;
  const view = request.nextUrl.searchParams.get('view') === 'paid' ? 'paid' : 'owed';
  try {
    return successResponse(view === 'paid' ? await listRecentStaffShares() : await listOwedStaffShares());
  } catch (error) {
    console.error('Error loading team payouts:', error);
    return ApiErrors.ServerError('Failed to load team payouts');
  }
}
