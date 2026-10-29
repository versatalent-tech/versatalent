import { randomBytes } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { parseSignedRequest, readSignedRequest } from '@/lib/instagram/signed-request';
import { deleteForMetaUser, recordDeletionRequest } from '@/lib/db/repositories/instagram-accounts';
import { logAudit } from '@/lib/db/repositories/audit-log';
import { SITE_URL } from '@/lib/site-url';
import { ApiErrors } from '@/lib/utils/api-response';

export const dynamic = 'force-dynamic';

/**
 * POST /api/instagram/data-deletion - Meta calls this when someone asks for
 * their data to be deleted. Their connected account, token, posts and every
 * daily figure are deleted now. Answers in the format Meta requires: a page
 * where they can check, and a confirmation code.
 * Set as the "Data deletion request URL" in the Meta app.
 */
export async function POST(request: NextRequest) {
  const secret = process.env.INSTAGRAM_APP_SECRET;
  const signed = await readSignedRequest(request);
  const parsed = secret && signed ? parseSignedRequest(signed, secret) : null;
  if (!parsed) return ApiErrors.BadRequest('Invalid signed request');

  try {
    const count = await deleteForMetaUser(parsed.userId);
    const code = randomBytes(12).toString('hex');
    await recordDeletionRequest(code);
    await logAudit({ name: 'Instagram (data deletion request)' }, 'delete', 'instagram_account', null, { after: { accounts: count, code } });
    return NextResponse.json({ url: `${SITE_URL}/instagram/data-deletion?code=${code}`, confirmation_code: code });
  } catch (error) {
    console.error('[instagram] Data deletion failed:', error);
    return ApiErrors.ServerError('Failed to process');
  }
}
