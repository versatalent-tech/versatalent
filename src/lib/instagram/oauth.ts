import { randomBytes, timingSafeEqual } from 'node:crypto';
import { INSTAGRAM_AUTHORIZE_URL, INSTAGRAM_REDIRECT_URI } from './config';
import { INSTAGRAM_SCOPES } from './scopes';

/**
 * Connecting an account: /api/instagram/connect sends the person to
 * Instagram with a random `state`, also kept in a short-lived cookie; the
 * callback only accepts Instagram's answer if the two match. The cookie says
 * only whether a talent or VersaTalent is connecting; who exactly is always
 * taken from the signed-in session again at the callback.
 */

export const OAUTH_COOKIE = 'ig_oauth';
export type ConnectKind = 'talent' | 'agency';

export const RETURN_PATHS: Record<ConnectKind, string> = {
  talent: '/portal/profile',
  agency: '/admin/instagram',
};

export const OAUTH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  maxAge: 10 * 60,
  path: '/api/instagram',
};

export function newOAuthState(kind: ConnectKind): { state: string; cookie: string } {
  const state = randomBytes(24).toString('hex');
  return { state, cookie: Buffer.from(JSON.stringify({ state, kind })).toString('base64url') };
}

export function readOAuthCookie(cookie: string | undefined, state: string | null): ConnectKind | null {
  if (!cookie || !state) return null;
  try {
    const saved = JSON.parse(Buffer.from(cookie, 'base64url').toString('utf8'));
    if (saved.kind !== 'talent' && saved.kind !== 'agency') return null;
    const a = Buffer.from(String(saved.state));
    const b = Buffer.from(state);
    return a.length === b.length && timingSafeEqual(a, b) ? saved.kind : null;
  } catch {
    return null;
  }
}

export function authorizeUrl(appId: string, state: string): string {
  const params = new URLSearchParams({
    client_id: appId,
    redirect_uri: INSTAGRAM_REDIRECT_URI,
    response_type: 'code',
    scope: INSTAGRAM_SCOPES.join(','),
    state,
    // Always ask which account to connect, rather than using whoever is logged in to Instagram
    force_reauth: 'true',
  });
  return `${INSTAGRAM_AUTHORIZE_URL}?${params}`;
}
