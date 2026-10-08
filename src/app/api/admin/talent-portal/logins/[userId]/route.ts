import { NextRequest } from 'next/server';
import { z } from 'zod';
import { requireTeamPermission } from '@/lib/middleware/auth';
import { parseBody } from '@/lib/crm/route-helpers';
import { getArtistUser, setArtistUserActive } from '@/lib/db/repositories/portal';
import { logAudit } from '@/lib/db/repositories/audit-log';
import { ApiErrors, successResponse } from '@/lib/utils/api-response';
import { isValidUUID } from '@/lib/utils/validation';

const schema = z.object({ is_active: z.boolean() });

// PATCH /api/admin/talent-portal/logins/[userId] - turn a talent's portal access on or off
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  const auth = await requireTeamPermission('portal.manage');
  if ('response' in auth) return auth.response;
  const { userId } = await params;
  if (!isValidUUID(userId)) return ApiErrors.NotFound('Login');
  const body = await parseBody(request, schema);
  if ('response' in body) return body.response;

  const user = await getArtistUser(userId);
  if (!user) return ApiErrors.NotFound('Login');
  await setArtistUserActive(userId, body.data.is_active!);
  await logAudit({ userId: auth.session.userId, name: auth.session.name }, body.data.is_active ? 'enable' : 'disable', 'talent_login', userId);
  return successResponse(null, body.data.is_active ? 'Portal access on' : 'Portal access off');
}
