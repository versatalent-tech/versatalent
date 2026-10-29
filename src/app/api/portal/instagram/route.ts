import { requireTalent } from '@/lib/auth/talent-auth';
import { isInstagramConfigured } from '@/lib/instagram/config';
import { disconnectInstagramAccount, getInstagramAccountFor } from '@/lib/db/repositories/instagram-accounts';
import { logAudit } from '@/lib/db/repositories/audit-log';
import { ApiErrors, successResponse } from '@/lib/utils/api-response';

export const dynamic = 'force-dynamic';

// GET /api/portal/instagram - the signed-in talent's connected account, if any
export async function GET() {
  const auth = await requireTalent();
  if ('response' in auth) return auth.response;
  try {
    return successResponse({ configured: isInstagramConfigured(), account: await getInstagramAccountFor(auth.talent.talentId) });
  } catch (error) {
    console.error('Portal Instagram error:', error);
    return ApiErrors.ServerError('Failed to load your Instagram connection');
  }
}

// DELETE /api/portal/instagram - disconnect: the access token is deleted now
export async function DELETE() {
  const auth = await requireTalent();
  if ('response' in auth) return auth.response;
  try {
    const account = await getInstagramAccountFor(auth.talent.talentId);
    if (!account || !(await disconnectInstagramAccount(account.id))) return ApiErrors.NotFound('Instagram connection');
    await logAudit({ userId: auth.talent.userId, name: auth.talent.name }, 'disconnect', 'instagram_account', account.id);
    return successResponse({ configured: isInstagramConfigured(), account: await getInstagramAccountFor(auth.talent.talentId) }, 'Disconnected');
  } catch (error) {
    console.error('Portal Instagram disconnect error:', error);
    return ApiErrors.ServerError('Failed to disconnect');
  }
}
