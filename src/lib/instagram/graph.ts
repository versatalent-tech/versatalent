import {
  INSTAGRAM_GRAPH_ROOT,
  INSTAGRAM_GRAPH_URL,
  INSTAGRAM_REDIRECT_URI,
  INSTAGRAM_TOKEN_URL,
  instagramAppConfig,
} from './config';

/**
 * Calls to Instagram's API ("Instagram API with Instagram Login"). Tokens are
 * passed as the access_token parameter, as Instagram documents; URLs are never
 * logged or put in error messages, so tokens don't end up in logs.
 */

export class InstagramApiError extends Error {
  constructor(message: string, readonly status: number, readonly code?: number) {
    super(message);
  }
  /** The token is no longer valid: expired, revoked or the app was removed */
  get tokenInvalid(): boolean {
    return this.code === 190 || this.status === 401;
  }
}

async function call(url: string, init?: RequestInit): Promise<any> {
  const response = await fetch(url, { ...init, cache: 'no-store', signal: AbortSignal.timeout(15000) });
  const body = await response.json().catch(() => ({}));
  if (!response.ok || body?.error || body?.error_type) {
    const error = body?.error ?? body;
    throw new InstagramApiError(
      error?.message ?? error?.error_message ?? `Instagram returned ${response.status}`,
      response.status,
      typeof error?.code === 'number' ? error.code : undefined
    );
  }
  return body;
}

function requireConfig() {
  const config = instagramAppConfig();
  if (!config) throw new Error('Instagram isn’t set up (INSTAGRAM_APP_ID, INSTAGRAM_APP_SECRET, INSTAGRAM_TOKEN_KEY)');
  return config;
}

export interface LongLivedToken {
  accessToken: string;
  expiresAt: Date;
}

/** Step 1 after Instagram redirects back: the one-off code → a short-lived token */
export async function exchangeCode(code: string): Promise<{ accessToken: string; userId: string; permissions: string[] }> {
  const { appId, appSecret } = requireConfig();
  const body = await call(INSTAGRAM_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: appId,
      client_secret: appSecret,
      grant_type: 'authorization_code',
      redirect_uri: INSTAGRAM_REDIRECT_URI,
      code,
    }),
  });
  // Instagram has answered both { access_token, … } and { data: [{ access_token, … }] }
  const data = Array.isArray(body?.data) ? body.data[0] : body;
  if (!data?.access_token) throw new InstagramApiError('Instagram didn’t return a token', 502);
  const permissions = Array.isArray(data.permissions)
    ? data.permissions
    : String(data.permissions ?? '').split(',').map((p: string) => p.trim()).filter(Boolean);
  return { accessToken: data.access_token, userId: String(data.user_id), permissions };
}

function toLongLived(body: any): LongLivedToken {
  if (!body?.access_token) throw new InstagramApiError('Instagram didn’t return a token', 502);
  return { accessToken: body.access_token, expiresAt: new Date(Date.now() + Number(body.expires_in ?? 0) * 1000) };
}

/** Step 2: the short-lived token → a 60-day token */
export async function exchangeForLongLivedToken(shortLived: string): Promise<LongLivedToken> {
  const { appSecret } = requireConfig();
  const params = new URLSearchParams({ grant_type: 'ig_exchange_token', client_secret: appSecret, access_token: shortLived });
  return toLongLived(await call(`${INSTAGRAM_GRAPH_ROOT}/access_token?${params}`));
}

/** A 60-day token that's at least a day old → a fresh 60-day token */
export async function refreshLongLivedToken(token: string): Promise<LongLivedToken> {
  const params = new URLSearchParams({ grant_type: 'ig_refresh_token', access_token: token });
  return toLongLived(await call(`${INSTAGRAM_GRAPH_ROOT}/refresh_access_token?${params}`));
}

export interface InstagramProfile {
  appUserId: string;
  userId: string;
  username: string;
  accountType: string | null;
  profilePictureUrl: string | null;
  followersCount: number | null;
  mediaCount: number | null;
}

export async function getProfile(token: string): Promise<InstagramProfile> {
  const params = new URLSearchParams({
    fields: 'id,user_id,username,account_type,profile_picture_url,followers_count,media_count',
    access_token: token,
  });
  const body = await call(`${INSTAGRAM_GRAPH_URL}/me?${params}`);
  return {
    appUserId: String(body.id),
    userId: String(body.user_id ?? body.id),
    username: body.username,
    accountType: body.account_type ?? null,
    profilePictureUrl: body.profile_picture_url ?? null,
    followersCount: typeof body.followers_count === 'number' ? body.followers_count : null,
    mediaCount: typeof body.media_count === 'number' ? body.media_count : null,
  };
}

export interface InstagramMediaItem {
  id: string;
  caption: string | null;
  mediaType: string | null;
  productType: string | null;
  permalink: string | null;
  shortcode: string | null;
  postedAt: Date;
  likeCount: number | null;
  commentsCount: number | null;
}

/** The account's posts and reels, newest first, back to `since` (at most `max`) */
export async function listMedia(token: string, since: Date, max: number): Promise<InstagramMediaItem[]> {
  const params = new URLSearchParams({
    fields: 'id,caption,media_type,media_product_type,permalink,shortcode,timestamp,like_count,comments_count',
    limit: '50',
    access_token: token,
  });
  let url: string | null = `${INSTAGRAM_GRAPH_URL}/me/media?${params}`;
  const items: InstagramMediaItem[] = [];

  while (url && items.length < max) {
    const body: any = await call(url);
    for (const raw of body?.data ?? []) {
      const postedAt = new Date(raw.timestamp);
      if (postedAt < since) return items;
      items.push({
        id: String(raw.id),
        caption: raw.caption ?? null,
        mediaType: raw.media_type ?? null,
        productType: raw.media_product_type ?? null,
        permalink: raw.permalink ?? null,
        shortcode: raw.shortcode ?? null,
        postedAt,
        likeCount: typeof raw.like_count === 'number' ? raw.like_count : null,
        commentsCount: typeof raw.comments_count === 'number' ? raw.comments_count : null,
      });
      if (items.length >= max) return items;
    }
    // Only follow "next" links back to Instagram, so the token never goes anywhere else
    const next: unknown = body?.paging?.next;
    url = typeof next === 'string' && next.startsWith(`${INSTAGRAM_GRAPH_ROOT}/`) ? next : null;
  }
  return items;
}

export interface MediaMetrics {
  views?: number;
  reach?: number;
  likes?: number;
  comments?: number;
  saved?: number;
  shares?: number;
  total_interactions?: number;
  follows?: number;
  profile_visits?: number;
  avg_watch_time_ms?: number;
}

const FEED_METRICS = ['views', 'reach', 'likes', 'comments', 'saved', 'shares', 'total_interactions', 'follows', 'profile_visits'];
const REELS_METRICS = ['views', 'reach', 'likes', 'comments', 'saved', 'shares', 'total_interactions', 'ig_reels_avg_watch_time'];
// Asked for instead if Instagram refuses one of the newer metrics for a post
const CORE_METRICS = ['reach', 'likes', 'comments', 'saved', 'shares'];

async function fetchInsights(token: string, mediaId: string, metrics: string[]): Promise<MediaMetrics> {
  const params = new URLSearchParams({ metric: metrics.join(','), access_token: token });
  const body = await call(`${INSTAGRAM_GRAPH_URL}/${encodeURIComponent(mediaId)}/insights?${params}`);
  const result: MediaMetrics = {};
  for (const entry of body?.data ?? []) {
    const value = entry?.values?.[0]?.value ?? entry?.total_value?.value;
    if (typeof value !== 'number') continue;
    const name = entry.name === 'ig_reels_avg_watch_time' ? 'avg_watch_time_ms' : entry.name;
    (result as Record<string, number>)[name] = Math.round(value);
  }
  return result;
}

/** A post's figures. Insights aren't available for every post (e.g. some very old ones) */
export async function getMediaInsights(token: string, mediaId: string, productType: string | null): Promise<MediaMetrics> {
  try {
    return await fetchInsights(token, mediaId, productType === 'REELS' ? REELS_METRICS : FEED_METRICS);
  } catch (error) {
    if (error instanceof InstagramApiError && !error.tokenInvalid && error.code === 100) {
      return fetchInsights(token, mediaId, CORE_METRICS);
    }
    throw error;
  }
}
