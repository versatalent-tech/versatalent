import { getTeamSession } from '@/lib/middleware/auth';
import { publicVapidKey } from '@/lib/notifications/push';
import { ApiErrors, successResponse } from '@/lib/utils/api-response';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/push/key - the key a browser needs to switch on push.
 * 404 when push isn't set up, or for the env-configured admin (no account to save a device to).
 */
export async function GET() {
  const session = await getTeamSession();
  if (!session) return ApiErrors.Unauthorized('Please sign in');
  const key = publicVapidKey();
  if (!key || !session.userId) return ApiErrors.NotFound('Phone notifications');
  return successResponse({ key });
}
