import { requireTeamPermission } from '@/lib/middleware/auth';
import { listFoundingPayments } from '@/lib/db/repositories/founding';
import { ApiErrors, successResponse } from '@/lib/utils/api-response';

export const dynamic = 'force-dynamic';

// GET /api/admin/founding/payments - every payment taken, to check against SumUp
export async function GET() {
  const auth = await requireTeamPermission('venue.manage');
  if ('response' in auth) return auth.response;
  try {
    return successResponse(await listFoundingPayments());
  } catch (error) {
    console.error('Error loading Founding payments:', error);
    return ApiErrors.ServerError('Failed to load');
  }
}
