import { NextRequest } from 'next/server';
import { requireTeamPermission } from '@/lib/middleware/auth';
import { getArtistUser } from '@/lib/db/repositories/portal';
import { createAuthLink } from '@/lib/db/repositories/team';
import { logAudit } from '@/lib/db/repositories/audit-log';
import { setupLink } from '@/lib/utils/team';
import { ApiErrors, successResponse } from '@/lib/utils/api-response';
import { isValidUUID } from '@/lib/utils/validation';

// POST /api/admin/talent-portal/logins/[userId]/link - one-time link to set (or reset) the talent's password
export async function POST(request: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  const auth = await requireTeamPermission('portal.manage');
  if ('response' in auth) return auth.response;
  const { userId } = await params;
  if (!isValidUUID(userId)) return ApiErrors.NotFound('Login');

  const user = await getArtistUser(userId);
  if (!user) return ApiErrors.NotFound('Login');
  if (!user.is_active) return ApiErrors.BadRequest('Turn portal access on before sending a link');

  const purpose = user.has_password ? 'reset' : 'invite';
  const link = await createAuthLink(userId, purpose, auth.session.userId);
  await logAudit({ userId: auth.session.userId, name: auth.session.name }, `${purpose}_link`, 'talent_login', userId);
  return successResponse({ link: setupLink(request, link.token), purpose, expiresAt: link.expiresAt.toISOString() });
}
