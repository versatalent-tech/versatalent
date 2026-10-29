import { createHmac, randomBytes } from 'node:crypto';
import { test, expect, type APIRequestContext } from '@playwright/test';
import { createTalent, createTalentLogin, createTeamUser, sql } from '../support/db';
import { adminApi, anonymousApi, portalApi, teamApi } from '../support/auth';
import { INSTAGRAM_SCOPES } from '../../src/lib/instagram/scopes';

// Everything goes to the pretend Instagram in e2e/mocks/instagram.mjs
const MOCK = 'http://127.0.0.1:4011';
const mock = (path: string, data: unknown) =>
  fetch(`${MOCK}${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });

const id = () => randomBytes(5).toString('hex');

/** A pretend Instagram account: 4 recent posts (one legacy, one without insights) and one too old to collect */
async function instagramAccount(followers = 1234) {
  const key = id();
  const account = {
    key,
    userId: `1784${key}`,
    appUserId: `app${key}`,
    username: `e2e_${key}`,
    followers,
    media: [
      { id: `M1${key}`, daysAgo: 1, productType: 'REELS', caption: 'New mix out now #dj #leeds #amapiano' },
      { id: `M2${key}`, daysAgo: 5, productType: 'FEED', caption: 'Backstage' },
      { id: `M3${key}`, daysAgo: 20, productType: 'FEED', caption: 'Old format', legacy: true },
      { id: `M4${key}`, daysAgo: 40, productType: 'FEED', caption: null, noInsights: true },
      { id: `M5${key}`, daysAgo: 200, productType: 'FEED', caption: 'Too old to collect' },
    ],
  };
  await mock('/__accounts', account);
  return account;
}

/**
 * Connect, the way a browser would: our /connect → Instagram's authorize page
 * → back to our callback with a code. Returns where the callback sends them.
 */
async function connect(api: APIRequestContext, key: string | null, opts: { agency?: boolean; permissions?: string } = {}) {
  await mock('/__login', key ? { key, permissions: opts.permissions } : null);
  const start = await api.get(`/api/instagram/connect${opts.agency ? '?for=agency' : ''}`, { maxRedirects: 0 });
  expect(start.status()).toBe(307);
  const authorize = await fetch(start.headers()['location'], { redirect: 'manual' });
  const back = new URL(authorize.headers.get('location')!.replace(/#_$/, ''));
  const callback = await api.get(`/api/instagram/oauth/callback${back.search}`, { maxRedirects: 0 });
  return new URL(callback.headers()['location']);
}

async function talentWithLogin() {
  const talent = await createTalent();
  const login = await createTalentLogin(talent.id);
  return { talent, portal: await portalApi(login.email, login.password) };
}

const accountRow = async (igUserId: string) => (await sql`SELECT * FROM instagram_accounts WHERE ig_user_id = ${igUserId}`)[0];

function signedRequest(userId: string, secret = process.env.INSTAGRAM_APP_SECRET!) {
  const payload = Buffer.from(JSON.stringify({ algorithm: 'HMAC-SHA256', issued_at: Math.floor(Date.now() / 1000), user_id: userId })).toString('base64url');
  return `${createHmac('sha256', secret).update(payload).digest('base64url')}.${payload}`;
}

test.describe('Connecting Instagram accounts', () => {
  test('only profile and insights permissions are ever asked for, never messages', async () => {
    // If this fails, someone changed src/lib/instagram/scopes.ts: talents were promised no access to messages
    expect([...INSTAGRAM_SCOPES]).toEqual(['instagram_business_basic', 'instagram_business_manage_insights']);

    const { portal } = await talentWithLogin();
    const start = await portal.get('/api/instagram/connect', { maxRedirects: 0 });
    const url = new URL(start.headers()['location']);
    expect(url.origin + url.pathname).toBe(`${MOCK}/oauth/authorize`);
    expect(url.searchParams.get('scope')).toBe('instagram_business_basic,instagram_business_manage_insights');
    expect(url.searchParams.get('scope')).not.toMatch(/message|comment|publish/);
    expect(url.searchParams.get('client_id')).toBe('e2e-instagram-app');
    expect(url.searchParams.get('response_type')).toBe('code');
    expect(url.searchParams.get('force_reauth')).toBe('true');
    expect(url.searchParams.get('redirect_uri')).toMatch(/\/api\/instagram\/oauth\/callback$/);
    expect(url.searchParams.get('state')).toMatch(/^[0-9a-f]{48}$/);
  });

  test('a talent connects; posts and figures are collected and the token is stored encrypted', async ({ page }) => {
    const { talent, portal } = await talentWithLogin();
    const ig = await instagramAccount(1234);

    const back = await connect(portal, ig.key);
    expect(back.pathname).toBe('/portal/profile');
    expect(back.searchParams.get('instagram')).toBe('connected');

    const row = await accountRow(ig.userId);
    expect(row).toMatchObject({ talent_id: talent.id, username: ig.username, status: 'connected', followers_count: 1234 });
    expect(row.granted_scopes).toEqual(['instagram_business_basic', 'instagram_business_manage_insights']);
    // Encrypted, never the token itself
    expect(row.access_token_enc).toMatch(/^v1\./);
    expect(row.access_token_enc).not.toContain('long-');
    expect(new Date(row.token_expires_at).getTime()).toBeGreaterThan(Date.now() + 50 * 86_400_000);

    // The first sync ran: the 4 posts from the last 90 days, not the old one
    const media = await sql`SELECT * FROM instagram_media WHERE account_id = ${row.id} ORDER BY posted_at DESC`;
    expect(media.map((m: any) => m.id)).toEqual([`M1${ig.key}`, `M2${ig.key}`, `M3${ig.key}`, `M4${ig.key}`]);
    const [reel, post, legacy, noInsights] = media;
    expect(reel).toMatchObject({ media_product_type: 'REELS', views: 500, reach: 300, saved: 12, shares: 7, avg_watch_time_ms: 4200, hashtag_count: 3 });
    expect(post).toMatchObject({ views: 500, follows: 3, profile_visits: 20, total_interactions: 64 });
    // Instagram refused the newer metrics for this one: the core figures instead
    expect(legacy).toMatchObject({ views: null, reach: 300, likes: 40 });
    // No insights at all: the post's own likes and comments are kept
    expect(noInsights).toMatchObject({ reach: null, likes: 10, comments: 2 });

    expect((await sql`SELECT count(*)::int AS n FROM instagram_media_snapshots WHERE media_id LIKE ${'%' + ig.key}`)[0].n).toBe(4);
    expect((await sql`SELECT followers_count FROM instagram_account_snapshots WHERE account_id = ${row.id}`)[0].followers_count).toBe(1234);

    // The talent sees it in their portal, with the promise about messages
    const status = (await (await portal.get('/api/portal/instagram')).json()).data;
    expect(status.account).toMatchObject({ username: ig.username, status: 'connected', tracked_posts: 4 });
    expect(JSON.stringify(status)).not.toMatch(/access_token|v1\./);

    await page.context().addCookies((await portal.storageState()).cookies);
    await page.goto('/portal/profile');
    await expect(page.getByText(`Connected as @${ig.username}`)).toBeVisible();
    await expect(page.getByText('See or access your messages')).toBeVisible();
  });

  test('cancelled, expired, missing a permission, or someone else’s account: nothing is saved', async () => {
    const { portal } = await talentWithLogin();
    const ig = await instagramAccount();

    expect((await connect(portal, null)).searchParams.get('instagram')).toBe('cancelled');

    // No cookie from /connect (or a different state): refused
    const forged = await portal.get(`/api/instagram/oauth/callback?code=code-${ig.key}&state=${'0'.repeat(48)}`, { maxRedirects: 0 });
    expect(new URL(forged.headers()['location']).searchParams.get('instagram')).toBe('expired_link');

    const partial = await connect(portal, ig.key, { permissions: 'instagram_business_basic' });
    expect(partial.searchParams.get('instagram')).toBe('missing_permission');
    expect(await accountRow(ig.userId)).toBeUndefined();

    // Connected to one talent, then another talent tries the same account
    expect((await connect(portal, ig.key)).searchParams.get('instagram')).toBe('connected');
    const other = await talentWithLogin();
    expect((await connect(other.portal, ig.key)).searchParams.get('instagram')).toBe('linked_elsewhere');

    // And the first talent can't connect a second account without disconnecting
    const second = await instagramAccount();
    expect((await connect(portal, second.key)).searchParams.get('instagram')).toBe('other_account');
  });

  test('the sync renews access before it runs out, and stops when Instagram ends it', async () => {
    const { portal } = await talentWithLogin();
    const ig = await instagramAccount();
    await connect(portal, ig.key);
    const before = await accountRow(ig.userId);
    const admin = await adminApi();

    // 5 days left, last renewed 2 days ago: renewed
    await sql`UPDATE instagram_accounts SET token_expires_at = now() + interval '5 days', token_refreshed_at = now() - interval '2 days' WHERE id = ${before.id}`;
    expect((await admin.post('/api/admin/instagram/accounts', { data: { account_id: before.id } })).status()).toBe(202);
    const renewed = await accountRow(ig.userId);
    expect(renewed.access_token_enc).not.toBe(before.access_token_enc);
    expect(new Date(renewed.token_expires_at).getTime()).toBeGreaterThan(Date.now() + 50 * 86_400_000);
    expect(renewed.last_sync_error).toBeNull();

    // Instagram stops accepting the token: marked for reconnecting, token gone
    await mock('/__revoke', { key: ig.key });
    await admin.post('/api/admin/instagram/accounts', { data: { account_id: before.id } });
    const ended = await accountRow(ig.userId);
    expect(ended).toMatchObject({ status: 'expired', access_token_enc: null });
    expect(ended.last_sync_error).toMatch(/Connect the account again/);
    expect((await (await portal.get('/api/portal/instagram')).json()).data.account.status).toBe('expired');
  });

  test('disconnecting deletes the access; figures collected so far stay', async () => {
    const { portal } = await talentWithLogin();
    const ig = await instagramAccount();
    await connect(portal, ig.key);

    const response = await portal.delete('/api/portal/instagram');
    expect(response.status()).toBe(200);
    const row = await accountRow(ig.userId);
    expect(row).toMatchObject({ status: 'disconnected', access_token_enc: null, token_expires_at: null });
    expect((await sql`SELECT count(*)::int AS n FROM instagram_media WHERE account_id = ${row.id}`)[0].n).toBe(4);

    // Nothing more is collected for it
    const admin = await adminApi();
    await admin.post('/api/admin/instagram/accounts', { data: { account_id: row.id } });
    expect((await accountRow(ig.userId)).last_synced_at).toEqual(row.last_synced_at);
  });

  test('Meta’s deauthorize and data deletion callbacks', async ({ request, page }) => {
    const first = await talentWithLogin();
    const igA = await instagramAccount();
    await connect(first.portal, igA.key);
    const second = await talentWithLogin();
    const igB = await instagramAccount();
    await connect(second.portal, igB.key);

    // A forged signature does nothing
    const forged = await request.post('/api/instagram/deauthorize', { form: { signed_request: signedRequest(igA.appUserId, 'wrong-secret') } });
    expect(forged.status()).toBe(400);
    expect((await accountRow(igA.userId)).status).toBe('connected');

    // Removed the app on Instagram: access deleted
    const deauth = await request.post('/api/instagram/deauthorize', { form: { signed_request: signedRequest(igA.appUserId) } });
    expect(deauth.status()).toBe(200);
    expect(await accountRow(igA.userId)).toMatchObject({ status: 'disconnected', access_token_enc: null });

    // Asked for their data to be deleted: the account and everything collected for it
    const accountB = await accountRow(igB.userId);
    const deletion = await request.post('/api/instagram/data-deletion', { form: { signed_request: signedRequest(igB.appUserId) } });
    expect(deletion.status()).toBe(200);
    const body = await deletion.json();
    expect(body.confirmation_code).toMatch(/^[0-9a-f]{24}$/);
    expect(body.url).toContain(`/instagram/data-deletion?code=${body.confirmation_code}`);
    expect(await accountRow(igB.userId)).toBeUndefined();
    expect((await sql`SELECT count(*)::int AS n FROM instagram_media WHERE account_id = ${accountB.id}`)[0].n).toBe(0);
    expect((await sql`SELECT count(*)::int AS n FROM instagram_media_snapshots WHERE media_id LIKE ${'%' + igB.key}`)[0].n).toBe(0);

    await page.goto(`/instagram/data-deletion?code=${body.confirmation_code}`);
    await expect(page.getByText(/everything we collected from it .* has been deleted/)).toBeVisible();
  });

  test('VersaTalent’s account is connected by an admin; only the right people can connect or manage', async () => {
    // The test database is a copy: start without an agency account
    await sql`DELETE FROM instagram_accounts WHERE talent_id IS NULL`;
    const admin = await adminApi();
    const ig = await instagramAccount(5000);

    const back = await connect(admin, ig.key, { agency: true });
    expect(back.pathname).toBe('/admin/instagram');
    expect(back.searchParams.get('instagram')).toBe('connected');
    const accounts = (await (await admin.get('/api/admin/instagram/accounts')).json()).data;
    expect(accounts.configured).toBe(true);
    expect(accounts.accounts[0]).toMatchObject({ talent: null, username: ig.username, status: 'connected', followers_count: 5000 });
    expect(JSON.stringify(accounts)).not.toMatch(/access_token|v1\./);

    const anonymous = await anonymousApi();
    expect((await anonymous.get('/api/instagram/connect', { maxRedirects: 0 })).status()).toBe(401);
    expect((await anonymous.get('/api/instagram/connect?for=agency', { maxRedirects: 0 })).status()).toBe(401);
    expect((await anonymous.get('/api/admin/instagram/accounts')).status()).toBe(401);
    expect((await anonymous.get('/api/portal/instagram')).status()).toBe(401);

    const talent = await createTalent();
    const manager = await createTeamUser('manager', [talent.id]);
    const managerApi = await teamApi(manager.email, manager.password);
    expect((await managerApi.get('/api/instagram/connect?for=agency', { maxRedirects: 0 })).status()).toBe(403);
    expect((await managerApi.get('/api/admin/instagram/accounts')).status()).toBe(403);
    expect((await managerApi.delete(`/api/admin/instagram/accounts/${accounts.accounts[0].id}`)).status()).toBe(403);

    // A talent can't use the admin side, and their portal only ever shows their own account
    const { portal } = await talentWithLogin();
    expect((await portal.get('/api/admin/instagram/accounts')).status()).toBe(401);
    expect((await (await portal.get('/api/portal/instagram')).json()).data.account).toBeNull();
  });
});
