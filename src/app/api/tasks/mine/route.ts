import { requireTeamPermission } from '@/lib/middleware/auth';
import { listMyTasks } from '@/lib/db/repositories/my-tasks';
import { ApiErrors, successResponse } from '@/lib/utils/api-response';

export const dynamic = 'force-dynamic';

/** GET /api/tasks/mine - tasks given to the signed-in team member (used by road managers' dashboard) */
export async function GET() {
  const auth = await requireTeamPermission('dashboard.view');
  if ('response' in auth) return auth.response;
  if (!auth.session.userId) return successResponse([]); // the fallback admin login has no tasks
  try {
    return successResponse(await listMyTasks(auth.session.userId, { withSource: true }));
  } catch (error) {
    console.error('Error loading my tasks:', error);
    return ApiErrors.ServerError('Failed to load your tasks');
  }
}
