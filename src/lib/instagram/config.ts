import { SITE_URL } from '../site-url';

/**
 * Settings for connecting Instagram accounts ("Business Login for Instagram").
 * Set in Netlify; see docs/INSTAGRAM_SETUP.md:
 *
 *   INSTAGRAM_APP_ID      the Instagram app ID (Meta app → Instagram → API setup)
 *   INSTAGRAM_APP_SECRET  the Instagram app secret (same place)
 *   INSTAGRAM_TOKEN_KEY   32 random bytes, base64, used to encrypt stored tokens
 */

// INSTAGRAM_MOCK_BASE points the whole flow at the tests' pretend Instagram.
// Only an address on this machine is accepted
const MOCK_BASE = process.env.INSTAGRAM_MOCK_BASE;
const LOCAL_MOCK = MOCK_BASE && /^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(MOCK_BASE) ? MOCK_BASE : null;

export const INSTAGRAM_AUTHORIZE_URL = `${LOCAL_MOCK ?? 'https://www.instagram.com'}/oauth/authorize`;
export const INSTAGRAM_TOKEN_URL = `${LOCAL_MOCK ?? 'https://api.instagram.com'}/oauth/access_token`;
export const INSTAGRAM_GRAPH_URL = `${LOCAL_MOCK ?? 'https://graph.instagram.com'}/v26.0`;
/** Token exchange and refresh live at the unversioned root */
export const INSTAGRAM_GRAPH_ROOT = LOCAL_MOCK ?? 'https://graph.instagram.com';

/** Where Instagram sends people back after they approve; must be listed in the Meta app */
export const INSTAGRAM_REDIRECT_URI = `${SITE_URL}/api/instagram/oauth/callback`;

export function instagramAppConfig(): { appId: string; appSecret: string } | null {
  const appId = process.env.INSTAGRAM_APP_ID;
  const appSecret = process.env.INSTAGRAM_APP_SECRET;
  if (!appId || !appSecret || !process.env.INSTAGRAM_TOKEN_KEY) return null;
  return { appId, appSecret };
}

export function isInstagramConfigured(): boolean {
  return instagramAppConfig() !== null;
}
