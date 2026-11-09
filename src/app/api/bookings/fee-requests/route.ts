import { requireTeamPermission } from '@/lib/middleware/auth';
import { listPendingFeeRequests } from '@/lib/db/repositories/fee-requests';
import { ApiErrors, successResponse } from '@/lib/utils/api-response';

export const dynamic = 'force-dynamic';

// GET /api/bookings/fee-requests - managers' fee and commission changes waiting for approval (admins only)
export async function GET() {
  const auth = await requireTeamPermission('fees.approve');
  if ('response' in auth) return auth.response;
  try {
    return successResponse(await listPendingFeeRequests());
  } catch (error) {
    console.error('Error loading fee requests:', error);
    return ApiErrors.ServerError('Failed to load fee changes');
  }
}
