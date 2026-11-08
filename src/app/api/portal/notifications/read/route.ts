import { z } from 'zod';
import { requireTalent } from '@/lib/auth/talent-auth';
import { parseBody } from '@/lib/crm/route-helpers';
import { markNotificationsRead } from '@/lib/db/repositories/notifications';
import { ApiErrors, successResponse } from '@/lib/utils/api-response';

const schema = z.object({ ids: z.array(z.string().uuid()).max(100).optional() });

/** POST /api/portal/notifications/read - mark your notifications read (all, or the given ids) */
export async function POST(request: Request) {
  const auth = await requireTalent();
  if ('response' in auth) return auth.response;
  const body = await parseBody(request, schema);
  if ('response' in body) return body.response;
  try {
    return successResponse({ marked: await markNotificationsRead(auth.talent.userId, body.data.ids) });
  } catch (error) {
    console.error('Error marking notifications read:', error);
    return ApiErrors.ServerError('Failed to update notifications');
  }
}
