import { sql } from '../client';
import { decryptToken, encryptToken } from '../../instagram/token-crypto';
import type { InstagramMediaItem, InstagramProfile, MediaMetrics } from '../../instagram/graph';

/**
 * Connected Instagram accounts (talent_id NULL = VersaTalent's own), their
 * posts and daily snapshots. Tokens only leave this file decrypted for the
 * sync; nothing returned to a page or API includes them.
 */

export type InstagramAccountStatus = 'connected' | 'expired' | 'disconnected';

export interface InstagramAccountSummary {
  id: string;
  username: string;
  talent: { id: string; name: string } | null;
  status: InstagramAccountStatus;
  profile_picture_url: string | null;
  followers_count: number | null;
  tracked_posts: number;
  token_expires_at: string | null;
  connected_at: string;
  last_synced_at: string | null;
  last_sync_error: string | null;
}

function iso(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  return value instanceof Date ? value.toISOString() : String(value);
}

// Snapshots are per UK day
const today = () => sql`(now() AT TIME ZONE 'Europe/London')::date`;

const summarySelect = () => sql`
  SELECT a.*, t.name AS talent_name, (SELECT count(*) FROM instagram_media m WHERE m.account_id = a.id) AS tracked_posts
  FROM instagram_accounts a LEFT JOIN talents t ON t.id = a.talent_id
`;

function mapSummary(row: any): InstagramAccountSummary {
  return {
    id: row.id,
    username: row.username,
    talent: row.talent_id ? { id: row.talent_id, name: row.talent_name } : null,
    status: row.status,
    profile_picture_url: row.profile_picture_url,
    followers_count: row.followers_count === null ? null : Number(row.followers_count),
    tracked_posts: Number(row.tracked_posts),
    token_expires_at: iso(row.token_expires_at),
    connected_at: iso(row.connected_at)!,
    last_synced_at: iso(row.last_synced_at),
    last_sync_error: row.last_sync_error,
  };
}

/** Every account that has ever connected, VersaTalent's first */
export async function listInstagramAccounts(): Promise<InstagramAccountSummary[]> {
  const rows = await sql`${summarySelect()} ORDER BY (a.talent_id IS NOT NULL), t.name`;
  return rows.map(mapSummary);
}

/** One talent's account, or VersaTalent's when talentId is null */
export async function getInstagramAccountFor(talentId: string | null): Promise<InstagramAccountSummary | null> {
  const rows = await sql`
    ${summarySelect()} WHERE ${talentId === null ? sql`a.talent_id IS NULL` : sql`a.talent_id = ${talentId}`}
  `;
  return rows[0] ? mapSummary(rows[0]) : null;
}

export async function getInstagramAccount(id: string): Promise<InstagramAccountSummary | null> {
  const rows = await sql`${summarySelect()} WHERE a.id = ${id}`;
  return rows[0] ? mapSummary(rows[0]) : null;
}

export type SaveAccountResult = { id: string } | { error: 'linked_elsewhere' | 'other_account'; username?: string };

/**
 * Saves a freshly connected account for a talent (or VersaTalent). Refused if
 * that Instagram account is already linked to someone else, or if this
 * talent still has a different account connected.
 */
export async function saveConnectedAccount(input: {
  talentId: string | null;
  profile: InstagramProfile;
  accessToken: string;
  expiresAt: Date;
  scopes: string[];
  connectedBy: string | null;
}): Promise<SaveAccountResult> {
  const { talentId, profile } = input;

  const sameAccount = await sql`SELECT id, talent_id FROM instagram_accounts WHERE ig_user_id = ${profile.userId}`;
  if (sameAccount[0] && (sameAccount[0].talent_id ?? null) !== talentId) return { error: 'linked_elsewhere' };

  const current = await sql`
    SELECT id, ig_user_id, username, status FROM instagram_accounts
    WHERE ${talentId === null ? sql`talent_id IS NULL` : sql`talent_id = ${talentId}`}
  `;
  if (current[0] && current[0].ig_user_id !== profile.userId) {
    if (current[0].status === 'connected') return { error: 'other_account', username: current[0].username };
    // A previously disconnected account: replaced, with what was collected for it
    await sql`DELETE FROM instagram_accounts WHERE id = ${current[0].id}`;
  }

  const rows = await sql`
    INSERT INTO instagram_accounts (
      ig_user_id, ig_app_user_id, talent_id, username, account_type, profile_picture_url, followers_count, media_count,
      status, access_token_enc, token_expires_at, token_refreshed_at, granted_scopes, connected_by, connected_at,
      last_sync_error
    ) VALUES (
      ${profile.userId}, ${profile.appUserId}, ${talentId}, ${profile.username}, ${profile.accountType},
      ${profile.profilePictureUrl}, ${profile.followersCount}, ${profile.mediaCount},
      'connected', ${encryptToken(input.accessToken)}, ${input.expiresAt.toISOString()}, NOW(), ${input.scopes},
      ${input.connectedBy}, NOW(), NULL
    )
    ON CONFLICT (ig_user_id) DO UPDATE SET
      ig_app_user_id = EXCLUDED.ig_app_user_id, username = EXCLUDED.username, account_type = EXCLUDED.account_type,
      profile_picture_url = EXCLUDED.profile_picture_url, followers_count = EXCLUDED.followers_count,
      media_count = EXCLUDED.media_count, status = 'connected', access_token_enc = EXCLUDED.access_token_enc,
      token_expires_at = EXCLUDED.token_expires_at, token_refreshed_at = NOW(), granted_scopes = EXCLUDED.granted_scopes,
      connected_by = EXCLUDED.connected_by, connected_at = NOW(), last_sync_error = NULL, updated_at = NOW()
    RETURNING id
  `;
  await saveAccountSnapshot(rows[0].id, profile.followersCount, profile.mediaCount);
  return { id: rows[0].id };
}

/** Removes the token: nothing more is collected. What was collected stays for the figures */
export async function disconnectInstagramAccount(id: string): Promise<boolean> {
  const rows = await sql`
    UPDATE instagram_accounts SET status = 'disconnected', access_token_enc = NULL, token_expires_at = NULL, updated_at = NOW()
    WHERE id = ${id} RETURNING id
  `;
  return rows.length > 0;
}

/** Meta's "deauthorize" callback: the person removed the app on Instagram */
export async function disconnectForMetaUser(metaUserId: string): Promise<number> {
  const rows = await sql`
    UPDATE instagram_accounts SET status = 'disconnected', access_token_enc = NULL, token_expires_at = NULL, updated_at = NOW()
    WHERE ig_app_user_id = ${metaUserId} OR ig_user_id = ${metaUserId}
    RETURNING id
  `;
  return rows.length;
}

/** Meta's data deletion callback: the account and everything collected for it */
export async function deleteForMetaUser(metaUserId: string): Promise<number> {
  const rows = await sql`
    DELETE FROM instagram_accounts WHERE ig_app_user_id = ${metaUserId} OR ig_user_id = ${metaUserId} RETURNING id
  `;
  return rows.length;
}

export async function recordDeletionRequest(code: string): Promise<void> {
  await sql`INSERT INTO instagram_deletion_requests (confirmation_code, completed_at) VALUES (${code}, NOW())`;
}

export async function getDeletionRequest(code: string): Promise<{ requested_at: string; completed_at: string | null } | null> {
  const rows = await sql`SELECT requested_at, completed_at FROM instagram_deletion_requests WHERE confirmation_code = ${code}`;
  return rows[0] ? { requested_at: iso(rows[0].requested_at)!, completed_at: iso(rows[0].completed_at) } : null;
}

// ---------------------------------------------------------------------------
// The nightly sync
// ---------------------------------------------------------------------------

export interface AccountToSync {
  id: string;
  username: string;
  accessToken: string;
  tokenExpiresAt: Date | null;
  tokenRefreshedAt: Date | null;
}

export async function accountsToSync(onlyId?: string): Promise<AccountToSync[]> {
  const rows = await sql`
    SELECT id, username, access_token_enc, token_expires_at, token_refreshed_at FROM instagram_accounts
    WHERE status = 'connected' AND access_token_enc IS NOT NULL ${onlyId ? sql`AND id = ${onlyId}` : sql``}
  `;
  return rows.map((row: any) => ({
    id: row.id,
    username: row.username,
    accessToken: decryptToken(row.access_token_enc),
    tokenExpiresAt: row.token_expires_at ? new Date(row.token_expires_at) : null,
    tokenRefreshedAt: row.token_refreshed_at ? new Date(row.token_refreshed_at) : null,
  }));
}

export async function saveRefreshedToken(id: string, accessToken: string, expiresAt: Date): Promise<void> {
  await sql`
    UPDATE instagram_accounts SET access_token_enc = ${encryptToken(accessToken)}, token_expires_at = ${expiresAt.toISOString()},
      token_refreshed_at = NOW(), updated_at = NOW()
    WHERE id = ${id}
  `;
}

/** The token stopped working (expired or removed on Instagram): stop until they reconnect */
export async function markTokenExpired(id: string, message: string): Promise<void> {
  await sql`
    UPDATE instagram_accounts SET status = 'expired', access_token_enc = NULL, last_sync_error = ${message}, updated_at = NOW()
    WHERE id = ${id}
  `;
}

export async function recordSyncError(id: string, message: string): Promise<void> {
  await sql`UPDATE instagram_accounts SET last_sync_error = ${message}, updated_at = NOW() WHERE id = ${id}`;
}

export async function saveAccountSnapshot(id: string, followers: number | null, mediaCount: number | null): Promise<void> {
  await sql`
    INSERT INTO instagram_account_snapshots (account_id, taken_on, followers_count, media_count)
    VALUES (${id}, ${today()}, ${followers}, ${mediaCount})
    ON CONFLICT (account_id, taken_on) DO UPDATE SET followers_count = EXCLUDED.followers_count, media_count = EXCLUDED.media_count
  `;
}

export async function recordSyncedProfile(id: string, profile: InstagramProfile): Promise<void> {
  await sql`
    UPDATE instagram_accounts SET username = ${profile.username}, account_type = ${profile.accountType},
      profile_picture_url = ${profile.profilePictureUrl}, followers_count = ${profile.followersCount},
      media_count = ${profile.mediaCount}, last_synced_at = NOW(), last_sync_error = NULL, updated_at = NOW()
    WHERE id = ${id}
  `;
  await saveAccountSnapshot(id, profile.followersCount, profile.mediaCount);
}

const HASHTAG = /#[\p{L}\p{N}_]+/gu;

/** A post and today's figures (likes and comments fall back to the post's own counts) */
export async function saveMediaWithMetrics(accountId: string, item: InstagramMediaItem, metrics: MediaMetrics | null): Promise<void> {
  const m = {
    views: metrics?.views ?? null,
    reach: metrics?.reach ?? null,
    likes: metrics?.likes ?? item.likeCount,
    comments: metrics?.comments ?? item.commentsCount,
    saved: metrics?.saved ?? null,
    shares: metrics?.shares ?? null,
    total_interactions: metrics?.total_interactions ?? null,
    follows: metrics?.follows ?? null,
    profile_visits: metrics?.profile_visits ?? null,
    avg_watch_time_ms: metrics?.avg_watch_time_ms ?? null,
  };
  const caption = item.caption ?? '';

  await sql`
    INSERT INTO instagram_media (
      id, account_id, shortcode, media_type, media_product_type, caption, caption_length, hashtag_count, permalink, posted_at,
      views, reach, likes, comments, saved, shares, total_interactions, follows, profile_visits, avg_watch_time_ms, metrics_updated_at
    ) VALUES (
      ${item.id}, ${accountId}, ${item.shortcode}, ${item.mediaType}, ${item.productType}, ${item.caption},
      ${[...caption].length}, ${caption.match(HASHTAG)?.length ?? 0}, ${item.permalink}, ${item.postedAt.toISOString()},
      ${m.views}, ${m.reach}, ${m.likes}, ${m.comments}, ${m.saved}, ${m.shares}, ${m.total_interactions}, ${m.follows},
      ${m.profile_visits}, ${m.avg_watch_time_ms}, NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
      caption = EXCLUDED.caption, caption_length = EXCLUDED.caption_length, hashtag_count = EXCLUDED.hashtag_count,
      permalink = EXCLUDED.permalink, media_product_type = EXCLUDED.media_product_type,
      views = EXCLUDED.views, reach = EXCLUDED.reach, likes = EXCLUDED.likes, comments = EXCLUDED.comments,
      saved = EXCLUDED.saved, shares = EXCLUDED.shares, total_interactions = EXCLUDED.total_interactions,
      follows = EXCLUDED.follows, profile_visits = EXCLUDED.profile_visits, avg_watch_time_ms = EXCLUDED.avg_watch_time_ms,
      metrics_updated_at = NOW(), updated_at = NOW()
  `;
  await sql`
    INSERT INTO instagram_media_snapshots (
      media_id, taken_on, views, reach, likes, comments, saved, shares, total_interactions, follows, profile_visits, avg_watch_time_ms
    ) VALUES (
      ${item.id}, ${today()}, ${m.views}, ${m.reach}, ${m.likes}, ${m.comments}, ${m.saved}, ${m.shares},
      ${m.total_interactions}, ${m.follows}, ${m.profile_visits}, ${m.avg_watch_time_ms}
    )
    ON CONFLICT (media_id, taken_on) DO UPDATE SET
      views = EXCLUDED.views, reach = EXCLUDED.reach, likes = EXCLUDED.likes, comments = EXCLUDED.comments,
      saved = EXCLUDED.saved, shares = EXCLUDED.shares, total_interactions = EXCLUDED.total_interactions,
      follows = EXCLUDED.follows, profile_visits = EXCLUDED.profile_visits, avg_watch_time_ms = EXCLUDED.avg_watch_time_ms
  `;
}
