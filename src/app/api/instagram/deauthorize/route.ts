import { NextRequest } from 'next/server';
import { parseSignedRequest, readSignedRequest } from '@/lib/instagram/signed-request';
import { disconnectForMetaUser } from '@/lib/db/repositories/instagram-accounts';
import { logAudit } from '@/lib/db/repositories/audit-log';
import { ApiErrors, successResponse } from '@/lib/utils/api-response';

export const dynamic = 'force-dynamic';

/**
 * POST /api/instagram/deauthorize - Meta calls this when someone removes the
 * app from their Instagram account. Their token is deleted straight away.
 * Set as the "Deauthorize callback URL" in the Meta app.
 */
export async function POST(request: NextRequest) {
  const secret = process.env.INSTAGRAM_APP_SECRET;
  const signed = await readSignedRequest(request);
  const parsed = secret && signed ? parseSignedRequest(signed, secret) : null;
  if (!parsed) return ApiErrors.BadRequest('Invalid signed request');

  try {
    const count = await disconnectForMetaUser(parsed.userId);
    if (count > 0) await logAudit({ name: 'Instagram (deauthorized)' }, 'disconnect', 'instagram_account', null);
    return successResponse({ disconnected: count });
  } catch (error) {
    console.error('[instagram] Deauthorize failed:', error);
    return ApiErrors.ServerError('Failed to process');
  }
}
