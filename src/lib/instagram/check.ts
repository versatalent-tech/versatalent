/**
 * Asks Instagram whether a post can be embedded (it exists and is public),
 * using its public oEmbed endpoint. No account or token is involved.
 */

// INSTAGRAM_OEMBED_BASE points at the tests' pretend Instagram. Only an
// address on this machine is accepted
const MOCK_BASE = process.env.INSTAGRAM_OEMBED_BASE;
const OEMBED_BASE =
  MOCK_BASE && /^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(MOCK_BASE) ? MOCK_BASE : 'https://graph.facebook.com';

/**
 * 'embeddable': Instagram will show it.
 * 'unavailable': Instagram says it's deleted, private or not allowed to be embedded.
 * 'unknown': Instagram didn't answer clearly (down, rate-limited…); worth saving anyway.
 */
export type InstagramPostCheck = 'embeddable' | 'unavailable' | 'unknown';

export async function checkInstagramPost(permalink: string): Promise<InstagramPostCheck> {
  try {
    const response = await fetch(`${OEMBED_BASE}/instagram_oembed?url=${encodeURIComponent(permalink)}&omitscript=true`, {
      signal: AbortSignal.timeout(8000),
      cache: 'no-store',
    });
    if (response.ok) return 'embeddable';

    const body = await response.json().catch(() => null);
    const message = `${body?.error?.message ?? ''} ${body?.error?.error_user_msg ?? ''}`;
    return /not found|could not be embedded|does not exist/i.test(message) ? 'unavailable' : 'unknown';
  } catch {
    return 'unknown';
  }
}
