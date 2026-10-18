import { requireTalent } from '@/lib/auth/talent-auth';
import { listMyTasks } from '@/lib/db/repositories/my-tasks';
import { ApiErrors, successResponse } from '@/lib/utils/api-response';

export const dynamic = 'force-dynamic';

/** GET /api/portal/tasks - actions the team has given the talent (without client or deal details) */
export async function GET() {
  const auth = await requireTalent();
  if ('response' in auth) return auth.response;
  try {
    return successResponse(await listMyTasks(auth.talent.userId, { withSource: false }));
  } catch (error) {
    console.error('Error loading portal tasks:', error);
    return ApiErrors.ServerError('Failed to load your to-dos');
  }
}
