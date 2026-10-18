import { NextRequest } from 'next/server';
import { requireTeamPermission } from '@/lib/middleware/auth';
import { balanceChecks, listLedger } from '@/lib/db/repositories/loyalty';
import { ApiErrors, successResponse } from '@/lib/utils/api-response';
import { isValidUUID } from '@/lib/utils/validation';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/rewards/balances - check every balance against its ledger
 * GET /api/admin/rewards/balances?member=<id> - that member's ledger entries
 */
export async function GET(request: NextRequest) {
  const auth = await requireTeamPermission('venue.manage');
  if ('response' in auth) return auth.response;
  const member = request.nextUrl.searchParams.get('member');
  try {
    if (member && isValidUUID(member)) return successResponse(await listLedger(member, null, 200));
    return successResponse(await balanceChecks());
  } catch (error) {
    console.error('Error checking balances:', error);
    return ApiErrors.ServerError('Failed to load');
  }
}
