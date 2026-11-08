import { requireTalent } from '@/lib/auth/talent-auth';
import { publicVapidKey } from '@/lib/notifications/push';
import { ApiErrors, successResponse } from '@/lib/utils/api-response';

export const dynamic = 'force-dynamic';

/** GET /api/portal/push/key - the key a browser needs to switch on push; 404 when push isn't set up */
export async function GET() {
  const auth = await requireTalent();
  if ('response' in auth) return auth.response;
  const key = publicVapidKey();
  if (!key) return ApiErrors.NotFound('Phone notifications');
  return successResponse({ key });
}
