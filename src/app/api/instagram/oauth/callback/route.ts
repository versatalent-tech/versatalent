import { NextRequest, NextResponse } from 'next/server';
import { getTeamSession } from '@/lib/middleware/auth';
import { can } from '@/lib/auth/permissions';
import { getTalentSession } from '@/lib/auth/talent-auth';
import { OAUTH_COOKIE, RETURN_PATHS, readOAuthCookie, type ConnectKind } from '@/lib/instagram/oauth';
import { INSTAGRAM_SCOPES } from '@/lib/instagram/scopes';
import { exchangeCode, exchangeForLongLivedToken, getProfile } from '@/lib/instagram/graph';
import { startInstagramSync } from '@/lib/instagram/sync';
import { saveConnectedAccount } from '@/lib/db/repositories/instagram-accounts';
import { logAudit } from '@/lib/db/repositories/audit-log';

export const dynamic = 'force-dynamic';

/**
 * GET /api/instagram/oauth/callback?code&state - Instagram sends the person
 * back here after they approve (or cancel). Saves the account and starts the
 * first sync, then returns them to the portal or admin with ?instagram=<result>.
 */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const kind = readOAuthCookie(request.cookies.get(OAUTH_COOKIE)?.value, params.get('state'));
  const done = (target: ConnectKind | null, result: string) => {
    const url = new URL(target ? RETURN_PATHS[target] : '/', request.nextUrl.origin);
    url.searchParams.set('instagram', result);
    const response = NextResponse.redirect(url);
    response.cookies.delete({ name: OAUTH_COOKIE, path: '/api/instagram' });
    return response;
  };

  // Not started here, started too long ago, or someone else's link
  if (!kind) return done(null, 'expired_link');
  if (params.get('error')) return done(kind, 'cancelled');

  // Who is connecting comes from the session, never from the request
  let talentId: string | null = null;
  let actor: { userId?: string; name?: string };
  if (kind === 'talent') {
    const talent = await getTalentSession();
    if (!talent) return done(kind, 'signed_out');
    talentId = talent.talentId;
    actor = { userId: talent.userId, name: talent.name };
  } else {
    const session = await getTeamSession();
    if (!session || !can(session.role, 'venue.manage')) return done(kind, 'signed_out');
    actor = { userId: session.userId, name: session.name };
  }

  // Instagram may add "#_" to the code
  const code = (params.get('code') ?? '').replace(/#_$/, '');
  if (!code) return done(kind, 'failed');

  try {
    const short = await exchangeCode(code);
    if (!INSTAGRAM_SCOPES.every((scope) => short.permissions.includes(scope))) return done(kind, 'missing_permission');

    const token = await exchangeForLongLivedToken(short.accessToken);
    const profile = await getProfile(token.accessToken);
    const saved = await saveConnectedAccount({
      talentId,
      profile,
      accessToken: token.accessToken,
      expiresAt: token.expiresAt,
      scopes: short.permissions.filter((p) => (INSTAGRAM_SCOPES as readonly string[]).includes(p)),
      connectedBy: actor.userId ?? null,
    });
    if ('error' in saved) return done(kind, saved.error);

    await logAudit(actor, 'connect', 'instagram_account', saved.id, { after: { username: profile.username, talent_id: talentId } });

    // The first figures; the nightly sync carries on if this doesn't finish
    await startInstagramSync(request.nextUrl.origin, saved.id).catch((error) =>
      console.error('[instagram] First sync failed to start:', error instanceof Error ? error.message : error)
    );
    return done(kind, 'connected');
  } catch (error) {
    console.error('[instagram] Connecting failed:', error instanceof Error ? error.message : error);
    return done(kind, 'failed');
  }
}
