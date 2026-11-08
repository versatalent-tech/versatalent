import { requireTalent } from '@/lib/auth/talent-auth';
import { listNotifications } from '@/lib/db/repositories/notifications';
import { ApiErrors, successResponse } from '@/lib/utils/api-response';

export const dynamic = 'force-dynamic';

/** GET /api/portal/notifications - the talent's latest notifications and unread count */
export async function GET() {
  const auth = await requireTalent();
  if ('response' in auth) return auth.response;
  try {
    return successResponse(await listNotifications(auth.talent.userId));
  } catch (error) {
    console.error('Error loading notifications:', error);
    return ApiErrors.ServerError('Failed to load notifications');
  }
}
