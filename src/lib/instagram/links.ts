/**
 * Instagram post links. Only the post's code and kind are stored; the links
 * are rebuilt from them, so a pasted share link, a link with the username in
 * it and a short instagr.am link all become the same post.
 */

export type InstagramPostKind = 'p' | 'reel' | 'tv';

export interface InstagramPostRef {
  kind: InstagramPostKind;
  shortcode: string;
}

const SHORTCODE = /^[A-Za-z0-9_-]{5,40}$/;
const KINDS: Record<string, InstagramPostKind> = { p: 'p', reel: 'reel', reels: 'reel', tv: 'tv' };

/**
 * Reads a pasted Instagram post or reel link, or returns null when it isn't one.
 * Accepts instagram.com/p/CODE, /reel/CODE, /reels/CODE, /tv/CODE, the same with
 * the username before them (instagram.com/name/p/CODE), and instagr.am links,
 * with or without https://, www., query strings or anything after the code.
 */
export function parseInstagramUrl(input: string): InstagramPostRef | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  let url: URL;
  try {
    url = new URL(/^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`);
  } catch {
    return null;
  }

  const host = url.hostname.toLowerCase().replace(/^(www\.|m\.)/, '');
  if (host !== 'instagram.com' && host !== 'instagr.am') return null;

  const parts = url.pathname.split('/').filter(Boolean);
  for (let i = 0; i < parts.length - 1; i++) {
    const kind = KINDS[parts[i].toLowerCase()];
    // The kind is either first, or second after the username
    if (kind && i <= 1 && SHORTCODE.test(parts[i + 1])) {
      return { kind, shortcode: parts[i + 1] };
    }
  }
  return null;
}

/** The post's public link, e.g. https://www.instagram.com/reel/CODE/ */
export function instagramPermalink({ kind, shortcode }: InstagramPostRef): string {
  return `https://www.instagram.com/${kind}/${shortcode}/`;
}
