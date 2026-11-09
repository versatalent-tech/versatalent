import { requireTeamPermission } from '@/lib/middleware/auth';
import { listMyEarnings } from '@/lib/db/repositories/staff-shares';
import { ApiErrors, successResponse } from '@/lib/utils/api-response';

export const dynamic = 'force-dynamic';

// GET /api/earnings/mine - a manager's or road manager's own share of their talents' bookings
export async function GET() {
  const auth = await requireTeamPermission('dashboard.view');
  if ('response' in auth) return auth.response;
  const { role, userId } = auth.session;
  if ((role !== 'manager' && role !== 'road_manager') || !userId) {
    return ApiErrors.Forbidden('Only managers and road managers have earnings here');
  }
  try {
    const response = successResponse(await listMyEarnings(userId));
    response.headers.set('Cache-Control', 'private, no-store');
    return response;
  } catch (error) {
    console.error('Error loading earnings:', error);
    return ApiErrors.ServerError('Failed to load your earnings');
  }
}
