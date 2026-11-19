import { z } from 'zod';
import { getTeamSession } from '@/lib/middleware/auth';
import { parseBody } from '@/lib/crm/route-helpers';
import { markNotificationsRead } from '@/lib/db/repositories/notifications';
import { ApiErrors, successResponse } from '@/lib/utils/api-response';

const schema = z.object({ ids: z.array(z.string().uuid()).max(100).optional() });

/** POST /api/admin/notifications/read - mark your notifications read (all, or the given ids) */
export async function POST(request: Request) {
  const session = await getTeamSession();
  if (!session) return ApiErrors.Unauthorized('Please sign in');
  const body = await parseBody(request, schema);
  if ('response' in body) return body.response;
  if (!session.userId) return successResponse({ marked: 0 });
  try {
    return successResponse({ marked: await markNotificationsRead(session.userId, body.data.ids) });
  } catch (error) {
    console.error('Error marking team notifications read:', error);
    return ApiErrors.ServerError('Failed to update notifications');
  }
}
