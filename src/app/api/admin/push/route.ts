import { getTeamSession } from '@/lib/middleware/auth';
import { parseBody } from '@/lib/crm/route-helpers';
import { deletePushDevice, savePushDevice } from '@/lib/db/repositories/notifications';
import { pushDeleteSchema, pushSaveSchema } from '@/lib/notifications/push-schemas';
import { ApiErrors, successResponse } from '@/lib/utils/api-response';

/**
 * Phone notifications for team members (admins, managers, road managers).
 * The env-configured admin has no user row to save a device against.
 */
async function teamUser(): Promise<{ userId: string } | { response: Response }> {
  const session = await getTeamSession();
  if (!session) return { response: ApiErrors.Unauthorized('Please sign in') };
  if (!session.userId) return { response: ApiErrors.BadRequest('Sign in with your own team account to get phone notifications') };
  return { userId: session.userId };
}

/** POST /api/admin/push - switch on phone notifications for this device */
export async function POST(request: Request) {
  const auth = await teamUser();
  if ('response' in auth) return auth.response;
  const body = await parseBody(request, pushSaveSchema);
  if ('response' in body) return body.response;
  try {
    await savePushDevice(auth.userId, {
      endpoint: body.data.endpoint,
      p256dh: body.data.keys.p256dh,
      auth: body.data.keys.auth,
      userAgent: request.headers.get('user-agent')?.slice(0, 300) ?? null,
    });
    return successResponse({ saved: true }, 'Notifications are on for this device');
  } catch (error) {
    console.error('Error saving team push device:', error);
    return ApiErrors.ServerError('Failed to switch on notifications');
  }
}

/** DELETE /api/admin/push - switch them off for this device */
export async function DELETE(request: Request) {
  const auth = await teamUser();
  if ('response' in auth) return auth.response;
  const body = await parseBody(request, pushDeleteSchema);
  if ('response' in body) return body.response;
  try {
    if (!(await deletePushDevice(auth.userId, body.data.endpoint))) return ApiErrors.NotFound('Device');
    return successResponse({ removed: true }, 'Notifications are off for this device');
  } catch (error) {
    console.error('Error removing team push device:', error);
    return ApiErrors.ServerError('Failed to switch off notifications');
  }
}
