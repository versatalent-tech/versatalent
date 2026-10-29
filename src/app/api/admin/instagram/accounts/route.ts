import { NextRequest } from 'next/server';
import { z } from 'zod';
import { requireTeamPermission } from '@/lib/middleware/auth';
import { parseBody } from '@/lib/crm/route-helpers';
import { isInstagramConfigured } from '@/lib/instagram/config';
import { startInstagramSync } from '@/lib/instagram/sync';
import { getInstagramAccount, listInstagramAccounts } from '@/lib/db/repositories/instagram-accounts';
import { logAudit } from '@/lib/db/repositories/audit-log';
import { ApiErrors, successResponse } from '@/lib/utils/api-response';

export const dynamic = 'force-dynamic';

const syncSchema = z.object({ account_id: z.string().uuid().nullable().optional() });

// GET /api/admin/instagram/accounts - every connected (or once-connected) account
export async function GET() {
  const auth = await requireTeamPermission('venue.manage');
  if ('response' in auth) return auth.response;
  try {
    return successResponse({ configured: isInstagramConfigured(), accounts: await listInstagramAccounts() });
  } catch (error) {
    console.error('Error listing Instagram accounts:', error);
    return ApiErrors.ServerError('Failed to load Instagram accounts');
  }
}

// POST /api/admin/instagram/accounts { account_id? } - sync now (one account, or all)
export async function POST(request: NextRequest) {
  const auth = await requireTeamPermission('venue.manage');
  if ('response' in auth) return auth.response;
  const body = await parseBody(request, syncSchema);
  if ('response' in body) return body.response;
  if (!isInstagramConfigured()) return ApiErrors.BadRequest('Instagram isn’t set up yet');

  const accountId = body.data.account_id ?? undefined;
  try {
    if (accountId && !(await getInstagramAccount(accountId))) return ApiErrors.NotFound('Instagram account');
    await startInstagramSync(request.nextUrl.origin, accountId);
    await logAudit({ userId: auth.session.userId, name: auth.session.name }, 'sync', 'instagram_account', accountId ?? null);
    return successResponse(
      { configured: true, accounts: await listInstagramAccounts() },
      'Sync started. New figures appear in a few minutes.',
      202
    );
  } catch (error) {
    console.error('Error starting Instagram sync:', error);
    return ApiErrors.ServerError('Couldn’t start the sync');
  }
}
