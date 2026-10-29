/**
 * Collecting connected accounts' figures: follower count, and each post and
 * reel from the last 90 days with its insights. Runs nightly in the Netlify
 * background function (netlify/functions/instagram-sync-background.mts),
 * right after an account connects, and from "Sync now" in the admin.
 *
 * Relative imports only: the background function is bundled outside Next.js,
 * without the @/ path alias.
 */
import { createHmac, timingSafeEqual } from 'node:crypto';
import {
  accountsToSync,
  markTokenExpired,
  recordSyncError,
  recordSyncedProfile,
  saveMediaWithMetrics,
  saveRefreshedToken,
} from '../db/repositories/instagram-accounts';
import { InstagramApiError, getMediaInsights, getProfile, listMedia, refreshLongLivedToken } from './graph';

const WINDOW_DAYS = 90;
const MAX_POSTS = 60;
const REFRESH_WITHIN_DAYS = 15;
const DAY_MS = 24 * 60 * 60 * 1000;

export interface SyncResult {
  accountId: string;
  username: string;
  ok: boolean;
  posts: number;
  message?: string;
}

async function syncOne(account: Awaited<ReturnType<typeof accountsToSync>>[number]): Promise<SyncResult> {
  let token = account.accessToken;
  try {
    // 60-day tokens can be renewed once they're a day old; renew in the last 15 days
    const expiresSoon = account.tokenExpiresAt && account.tokenExpiresAt.getTime() - Date.now() < REFRESH_WITHIN_DAYS * DAY_MS;
    const oldEnough = !account.tokenRefreshedAt || Date.now() - account.tokenRefreshedAt.getTime() > DAY_MS;
    if (expiresSoon && oldEnough) {
      const fresh = await refreshLongLivedToken(token);
      await saveRefreshedToken(account.id, fresh.accessToken, fresh.expiresAt);
      token = fresh.accessToken;
    }

    await recordSyncedProfile(account.id, await getProfile(token));

    const media = await listMedia(token, new Date(Date.now() - WINDOW_DAYS * DAY_MS), MAX_POSTS);
    for (const item of media) {
      let metrics = null;
      try {
        metrics = await getMediaInsights(token, item.id, item.productType);
      } catch (error) {
        if (error instanceof InstagramApiError && error.tokenInvalid) throw error;
        // Some posts have no insights; keep their likes and comments
      }
      await saveMediaWithMetrics(account.id, item, metrics);
    }
    return { accountId: account.id, username: account.username, ok: true, posts: media.length };
  } catch (error) {
    if (error instanceof InstagramApiError && error.tokenInvalid) {
      const message = 'Instagram ended our access (expired or removed). Connect the account again.';
      await markTokenExpired(account.id, message);
      return { accountId: account.id, username: account.username, ok: false, posts: 0, message };
    }
    const message = (error instanceof Error ? error.message : 'Sync failed').slice(0, 300);
    await recordSyncError(account.id, message);
    return { accountId: account.id, username: account.username, ok: false, posts: 0, message };
  }
}

/** Every connected account, one after another (or just one) */
export async function syncInstagramAccounts(onlyId?: string): Promise<SyncResult[]> {
  const results: SyncResult[] = [];
  for (const account of await accountsToSync(onlyId)) {
    results.push(await syncOne(account));
  }
  return results;
}

/**
 * The background function's URL is public, so it only runs when given this
 * value, derived from the app secret.
 */
export function instagramSyncToken(): string {
  return createHmac('sha256', process.env.INSTAGRAM_APP_SECRET ?? '').update('instagram-sync').digest('hex');
}

export function isValidInstagramSyncToken(token: unknown): boolean {
  if (typeof token !== 'string' || !process.env.INSTAGRAM_APP_SECRET) return false;
  const expected = Buffer.from(instagramSyncToken());
  const given = Buffer.from(token);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

/**
 * Starts a sync. On Netlify it runs in the background function (up to 15
 * minutes); in development and the tests (INSTAGRAM_SYNC_INLINE=1) it runs
 * here and is awaited.
 */
export async function startInstagramSync(origin: string, accountId?: string): Promise<void> {
  if (process.env.NODE_ENV !== 'production' || process.env.INSTAGRAM_SYNC_INLINE === '1') {
    await syncInstagramAccounts(accountId);
    return;
  }
  const started = await fetch(`${origin}/.netlify/functions/instagram-sync-background`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: instagramSyncToken(), accountId: accountId ?? null }),
  }).catch((error) => {
    console.error('[instagram-sync] Could not reach the background function:', error);
    return null;
  });
  if (!started || (started.status !== 202 && !started.ok)) throw new Error('Couldn’t start the Instagram sync');
}
