import { NextRequest, NextResponse } from 'next/server';
import { requireTeamPermission } from '@/lib/middleware/auth';
import { requireTalent } from '@/lib/auth/talent-auth';
import { instagramAppConfig } from '@/lib/instagram/config';
import { OAUTH_COOKIE, OAUTH_COOKIE_OPTIONS, RETURN_PATHS, authorizeUrl, newOAuthState, type ConnectKind } from '@/lib/instagram/oauth';

export const dynamic = 'force-dynamic';

/**
 * GET /api/instagram/connect             a signed-in talent connects their account (portal)
 * GET /api/instagram/connect?for=agency  an admin connects VersaTalent's account
 * Sends the person to Instagram to approve; Instagram brings them back to
 * /api/instagram/oauth/callback.
 */
export async function GET(request: NextRequest) {
  const kind: ConnectKind = request.nextUrl.searchParams.get('for') === 'agency' ? 'agency' : 'talent';
  const auth = kind === 'agency' ? await requireTeamPermission('venue.manage') : await requireTalent();
  if ('response' in auth) return auth.response;

  const back = new URL(RETURN_PATHS[kind], request.nextUrl.origin);
  const config = instagramAppConfig();
  if (!config) {
    back.searchParams.set('instagram', 'not_set_up');
    return NextResponse.redirect(back);
  }

  const { state, cookie } = newOAuthState(kind);
  const response = NextResponse.redirect(authorizeUrl(config.appId, state));
  response.cookies.set(OAUTH_COOKIE, cookie, OAUTH_COOKIE_OPTIONS);
  return response;
}
