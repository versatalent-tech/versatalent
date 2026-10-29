import { NextRequest } from 'next/server';
import { requireTeamPermission } from '@/lib/middleware/auth';
import { isInstagramConfigured } from '@/lib/instagram/config';
import { disconnectInstagramAccount, listInstagramAccounts } from '@/lib/db/repositories/instagram-accounts';
import { logAudit } from '@/lib/db/repositories/audit-log';
import { ApiErrors, successResponse } from '@/lib/utils/api-response';
import { isValidUUID } from '@/lib/utils/validation';

type Params = { params: Promise<{ id: string }> };

// DELETE /api/admin/instagram/accounts/[id] - disconnect: the access token is deleted now
export async function DELETE(_request: NextRequest, { params }: Params) {
  const auth = await requireTeamPermission('venue.manage');
  if ('response' in auth) return auth.response;
  const { id } = await params;
  if (!isValidUUID(id)) return ApiErrors.NotFound('Instagram account');

  try {
    if (!(await disconnectInstagramAccount(id))) return ApiErrors.NotFound('Instagram account');
    await logAudit({ userId: auth.session.userId, name: auth.session.name }, 'disconnect', 'instagram_account', id);
    return successResponse({ configured: isInstagramConfigured(), accounts: await listInstagramAccounts() }, 'Disconnected');
  } catch (error) {
    console.error('Error disconnecting Instagram account:', error);
    return ApiErrors.ServerError('Failed to disconnect');
  }
}
