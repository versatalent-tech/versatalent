import { z } from 'zod';
import { requireTalent } from '@/lib/auth/talent-auth';
import { parseBody } from '@/lib/crm/route-helpers';
import { deletePushDevice, savePushDevice } from '@/lib/db/repositories/notifications';
import { isPushEndpoint } from '@/lib/notifications/push';
import { ApiErrors, successResponse } from '@/lib/utils/api-response';

const endpoint = z.string().max(1000).refine(isPushEndpoint, 'This browser’s push service isn’t supported');
const saveSchema = z.object({
  endpoint,
  keys: z.object({ p256dh: z.string().min(1).max(200), auth: z.string().min(1).max(100) }),
});
const deleteSchema = z.object({ endpoint });

/** POST /api/portal/push - switch on phone notifications for this device */
export async function POST(request: Request) {
  const auth = await requireTalent();
  if ('response' in auth) return auth.response;
  const body = await parseBody(request, saveSchema);
  if ('response' in body) return body.response;
  try {
    await savePushDevice(auth.talent.userId, {
      endpoint: body.data.endpoint,
      p256dh: body.data.keys.p256dh,
      auth: body.data.keys.auth,
      userAgent: request.headers.get('user-agent')?.slice(0, 300) ?? null,
    });
    return successResponse({ saved: true }, 'Notifications are on for this device');
  } catch (error) {
    console.error('Error saving push device:', error);
    return ApiErrors.ServerError('Failed to switch on notifications');
  }
}

/** DELETE /api/portal/push - switch them off for this device */
export async function DELETE(request: Request) {
  const auth = await requireTalent();
  if ('response' in auth) return auth.response;
  const body = await parseBody(request, deleteSchema);
  if ('response' in body) return body.response;
  try {
    if (!(await deletePushDevice(auth.talent.userId, body.data.endpoint))) return ApiErrors.NotFound('Device');
    return successResponse({ removed: true }, 'Notifications are off for this device');
  } catch (error) {
    console.error('Error removing push device:', error);
    return ApiErrors.ServerError('Failed to switch off notifications');
  }
}
