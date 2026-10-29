/**
 * Background function: collects connected Instagram accounts' figures (see
 * src/lib/instagram/sync.ts). Started nightly by instagram-sync.mts, after an
 * account connects, and by "Sync now" in the admin. Background functions may
 * run for 15 minutes.
 *
 * Anyone can call this URL, so it only acts when given the sync token derived
 * from the Instagram app secret.
 */
import { isValidInstagramSyncToken, syncInstagramAccounts } from '../../src/lib/instagram/sync';

export default async (request: Request) => {
  const body = await request.json().catch(() => null);
  if (!isValidInstagramSyncToken(body?.token)) return;
  const accountId = typeof body?.accountId === 'string' && /^[0-9a-f-]{36}$/i.test(body.accountId) ? body.accountId : undefined;

  const results = await syncInstagramAccounts(accountId);
  for (const result of results) {
    console.log(`[instagram-sync] @${result.username}: ${result.ok ? `${result.posts} posts` : result.message}`);
  }
};

export const config = { background: true };
