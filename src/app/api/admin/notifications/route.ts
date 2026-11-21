import { getTeamSession } from '@/lib/middleware/auth';
import { listNotifications } from '@/lib/db/repositories/notifications';
import { ApiErrors, successResponse } from '@/lib/utils/api-response';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/notifications - the team member's latest notifications and
 * unread count. Any team role. The env-configured admin has no user row, so
 * nothing is ever saved for them: they get an empty list.
 */
export async function GET(request: Request) {
  const session = await getTeamSession();
  if (!session) return ApiErrors.Unauthorized('Please sign in');
  if (!session.userId) return successResponse({ items: [], unread: 0 });
  const limit = new URL(request.url).searchParams.get('limit') === 'all' ? 100 : 30;
  try {
    return successResponse(await listNotifications(session.userId, limit));
  } catch (error) {
    console.error('Error loading team notifications:', error);
    return ApiErrors.ServerError('Failed to load notifications');
  }
}
