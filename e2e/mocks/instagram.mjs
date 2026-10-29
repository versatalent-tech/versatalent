/**
 * A pretend Instagram for the tests, so nothing ever reaches Instagram or
 * Meta. The site only uses it when INSTAGRAM_OEMBED_BASE / INSTAGRAM_MOCK_BASE
 * point at an address on this machine.
 *
 * Checking post links (phase 1):
 *   GET /instagram_oembed?url=…   200 for any post, except:
 *     a code containing "Gone"    400 "Media Not Found" (deleted or private)
 *     a code containing "Flaky"   500 (Instagram not answering)
 *
 * Connecting accounts and their figures (phase 2):
 *   GET  /oauth/authorize              → redirects to redirect_uri with a code for the account set by /__login
 *   POST /oauth/access_token           code → short-lived token (+ the permissions /__login granted)
 *   GET  /access_token                 short-lived → 60-day token (checks the app secret)
 *   GET  /refresh_access_token         60-day token → a new one
 *   GET  /v26.0/me                     the account's profile
 *   GET  /v26.0/me/media               its posts, two per page
 *   GET  /v26.0/<media id>/insights    a post's figures
 * Test controls:
 *   POST /__accounts { key, userId, appUserId, username, followers, media: [{ id, daysAgo, productType, caption, legacy?, noInsights? }] }
 *   POST /__login    { key, permissions? }   the account the next authorize returns
 *   POST /__revoke   { key }                 its tokens stop working (code 190)
 *   GET  /__last-authorize                   the query of the last authorize request
 */
import http from 'node:http';

const PORT = Number(process.env.INSTAGRAM_MOCK_PORT || 4011);
const APP_SECRET = process.env.INSTAGRAM_APP_SECRET;
const BASE = `http://127.0.0.1:${PORT}`;
const ALL_SCOPES = 'instagram_business_basic,instagram_business_manage_insights';

const accounts = new Map(); // key → fixture
let nextLogin = null;
let lastAuthorize = null;
let tokenCount = 0;

function json(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body));
}

const tokenError = (res) => json(res, 400, { error: { message: 'Error validating access token', type: 'OAuthException', code: 190 } });

/** Tokens look like short-<key> or long-<key>-<n> */
function accountForToken(token) {
  const match = /^(short|long)-(.+?)(-\d+)?$/.exec(token ?? '');
  const account = match && accounts.get(match[2]);
  return account && !account.revoked ? account : null;
}

function mediaItem(m, account) {
  return {
    id: m.id,
    caption: m.caption ?? null,
    media_type: m.productType === 'REELS' ? 'VIDEO' : 'IMAGE',
    media_product_type: m.productType ?? 'FEED',
    permalink: `https://www.instagram.com/${m.productType === 'REELS' ? 'reel' : 'p'}/${m.id}/`,
    shortcode: m.id,
    timestamp: new Date(Date.now() - (m.daysAgo ?? 1) * 86_400_000).toISOString(),
    like_count: 10,
    comments_count: 2,
    username: account.username,
  };
}

function readBody(req) {
  return new Promise((resolve) => {
    let raw = '';
    req.on('data', (chunk) => (raw += chunk));
    req.on('end', () => resolve(raw));
  });
}

http
  .createServer(async (req, res) => {
    const url = new URL(req.url, BASE);
    const q = url.searchParams;
    const raw = await readBody(req);
    if (url.pathname === '/__health') return json(res, 200, { ok: true });

    // --- Test controls ---
    if (req.method === 'POST' && url.pathname === '/__accounts') {
      const body = JSON.parse(raw || '{}');
      accounts.set(body.key, { ...body, revoked: false });
      return json(res, 200, { ok: true });
    }
    if (req.method === 'POST' && url.pathname === '/__login') {
      nextLogin = JSON.parse(raw || '{}');
      return json(res, 200, { ok: true });
    }
    if (req.method === 'POST' && url.pathname === '/__revoke') {
      const account = accounts.get(JSON.parse(raw || '{}').key);
      if (account) account.revoked = true;
      return json(res, 200, { ok: true });
    }
    if (url.pathname === '/__last-authorize') return json(res, 200, lastAuthorize);

    // --- Checking post links ---
    if (req.method === 'GET' && url.pathname === '/instagram_oembed') {
      const postUrl = q.get('url') ?? '';
      if (postUrl.includes('Gone')) {
        return json(res, 400, {
          error: {
            message: 'Media Not Found',
            error_user_msg: 'The requested media could not be embedded either because it does not exist or you don’t have permission to embed it.',
          },
        });
      }
      if (postUrl.includes('Flaky')) return json(res, 500, { error: { message: 'An unexpected error has occurred.' } });
      return json(res, 200, { version: '1.0', provider_name: 'Instagram', type: 'rich', width: 658, html: '<blockquote></blockquote>' });
    }

    // --- Business Login for Instagram ---
    if (req.method === 'GET' && url.pathname === '/oauth/authorize') {
      lastAuthorize = Object.fromEntries(q);
      const back = new URL(q.get('redirect_uri'));
      if (!nextLogin) back.searchParams.set('error', 'access_denied');
      else back.searchParams.set('code', `code-${nextLogin.key}`);
      back.searchParams.set('state', q.get('state') ?? '');
      res.writeHead(302, { Location: `${back}#_` });
      return res.end();
    }
    if (req.method === 'POST' && url.pathname === '/oauth/access_token') {
      const form = new URLSearchParams(raw);
      const key = /^code-(.+)$/.exec(form.get('code') ?? '')?.[1];
      const account = key && accounts.get(key);
      if (form.get('client_secret') !== APP_SECRET || !account || form.get('grant_type') !== 'authorization_code') {
        return json(res, 400, { error_type: 'OAuthException', code: 400, error_message: 'Invalid code or secret' });
      }
      const permissions = nextLogin?.key === key && nextLogin.permissions ? nextLogin.permissions : ALL_SCOPES;
      return json(res, 200, { data: [{ access_token: `short-${key}`, user_id: account.userId, permissions }] });
    }
    if (req.method === 'GET' && url.pathname === '/access_token') {
      const account = accountForToken(q.get('access_token'));
      if (q.get('client_secret') !== APP_SECRET || q.get('grant_type') !== 'ig_exchange_token' || !account) return tokenError(res);
      return json(res, 200, { access_token: `long-${account.key}-${++tokenCount}`, token_type: 'bearer', expires_in: 5_184_000 });
    }
    if (req.method === 'GET' && url.pathname === '/refresh_access_token') {
      const account = accountForToken(q.get('access_token'));
      if (q.get('grant_type') !== 'ig_refresh_token' || !account) return tokenError(res);
      return json(res, 200, { access_token: `long-${account.key}-${++tokenCount}`, token_type: 'bearer', expires_in: 5_184_000 });
    }

    // --- Instagram API ---
    if (req.method === 'GET' && url.pathname.startsWith('/v26.0/')) {
      const account = accountForToken(q.get('access_token'));
      if (!account) return tokenError(res);
      const path = url.pathname.slice('/v26.0/'.length);

      if (path === 'me') {
        return json(res, 200, {
          id: account.appUserId,
          user_id: account.userId,
          username: account.username,
          account_type: 'MEDIA_CREATOR',
          profile_picture_url: null,
          followers_count: account.followers,
          media_count: account.media.length,
        });
      }
      if (path === 'me/media') {
        const after = Number(q.get('after') ?? 0);
        const items = account.media.slice(after, after + 2).map((m) => mediaItem(m, account));
        const nextAfter = after + 2;
        const paging = {};
        if (nextAfter < account.media.length) {
          const next = new URL(`${BASE}/v26.0/me/media`);
          next.searchParams.set('access_token', q.get('access_token'));
          next.searchParams.set('after', String(nextAfter));
          paging.next = next.toString();
        }
        return json(res, 200, { data: items, paging });
      }
      const insights = /^([^/]+)\/insights$/.exec(path);
      if (insights) {
        const media = account.media.find((m) => m.id === insights[1]);
        if (!media) return json(res, 400, { error: { message: 'Unsupported get request', code: 100 } });
        if (media.noInsights) return json(res, 400, { error: { message: 'Not enough viewers for insights', code: 10 } });
        const metrics = (q.get('metric') ?? '').split(',');
        if (media.legacy && metrics.includes('views')) {
          return json(res, 400, { error: { message: 'metric[0] must be one of the following values…', code: 100 } });
        }
        const values = { views: 500, reach: 300, likes: 40, comments: 5, saved: 12, shares: 7, total_interactions: 64, follows: 3, profile_visits: 20, ig_reels_avg_watch_time: 4200 };
        return json(res, 200, {
          data: metrics.filter((m) => m in values).map((name) => ({ name, period: 'lifetime', values: [{ value: values[name] }] })),
        });
      }
    }

    json(res, 404, { message: 'Unknown mock route' });
  })
  .listen(PORT, '127.0.0.1', () => console.log(`Mock Instagram on ${BASE}`));
