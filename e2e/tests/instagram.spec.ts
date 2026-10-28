import { randomBytes } from 'node:crypto';
import { test, expect } from '@playwright/test';
import { createTalent, createTeamUser, sql } from '../support/db';
import { adminApi, anonymousApi, teamApi } from '../support/auth';

// Instagram itself is never contacted: the site checks links with the pretend
// Instagram in e2e/mocks/instagram.mjs ("Gone" = deleted, "Flaky" = no answer)
const code = (tag = '') => `E2e${tag}${randomBytes(6).toString('base64url').replace(/[^A-Za-z0-9]/g, 'x')}`;
const permalink = (kind: string, shortcode: string) => `https://www.instagram.com/${kind}/${shortcode}/`;

async function publicPosts(query: string) {
  const api = await anonymousApi();
  const body = await (await api.get(`/api/instagram/posts?${query}`)).json();
  return body.data.map((p: { permalink: string }) => p.permalink) as string[];
}

test.describe('Instagram posts on the website', () => {
  test('admins add posts from any form of link, once, and only if Instagram can show them', async () => {
    const talent = await createTalent();
    const admin = await adminApi();
    const add = (url: string, talentId: string | null = talent.id, on_homepage = true) =>
      admin.post('/api/admin/instagram/posts', { data: { url, talent_id: talentId, on_homepage } });

    // A share link with the username, a stray /s and a tracking query, without https://
    const post = code();
    const added = await add(`instagram.com/someartist/p/${post}/s?igsh=abc123`);
    expect(added.status()).toBe(201);
    const saved = (await added.json()).data.find((p: { shortcode: string }) => p.shortcode === post);
    expect(saved).toMatchObject({
      kind: 'p',
      permalink: permalink('p', post),
      talent: { id: talent.id, name: talent.name },
      on_homepage: true,
      is_visible: true,
    });

    // The same post written differently is still the same post
    const again = await add(`https://www.instagram.com/p/${post}/`);
    expect(again.status()).toBe(409);
    expect((await again.json()).error).toBe('That post is already on the website');

    // /reels/ links are reels
    const reel = code();
    const reelBody = await (await add(`https://www.instagram.com/reels/${reel}/`)).json();
    expect(reelBody.data.find((p: { shortcode: string }) => p.shortcode === reel).kind).toBe('reel');

    expect((await (await add('https://example.com/p/ABCDEFG/')).json()).error).toBe(
      'That isn’t a link to an Instagram post or reel'
    );
    const gone = await add(`https://www.instagram.com/p/${code('Gone')}/`);
    expect(gone.status()).toBe(400);
    expect((await gone.json()).error).toMatch(/Instagram can’t show that post/);

    // When Instagram doesn't answer, the post is saved with a warning
    const flaky = await add(`https://www.instagram.com/p/${code('Flaky')}/`);
    expect(flaky.status()).toBe(201);
    expect((await flaky.json()).message).toMatch(/didn’t confirm it/);

    expect((await add(`https://www.instagram.com/p/${code()}/`, '00000000-0000-4000-8000-000000000000')).status()).toBe(404);
  });

  test('the public site shows visible posts in the chosen order', async () => {
    const talent = await createTalent();
    const admin = await adminApi();
    const add = async (shortcode: string, on_homepage: boolean) => {
      const body = await (
        await admin.post('/api/admin/instagram/posts', {
          data: { url: permalink('p', shortcode), talent_id: talent.id, on_homepage },
        })
      ).json();
      return body.data.find((p: { shortcode: string }) => p.shortcode === shortcode).id as string;
    };
    const [a, b] = [code(), code()];
    const idA = await add(a, true);
    const idB = await add(b, false);

    expect(await publicPosts(`talent=${talent.id}`)).toEqual([permalink('p', a), permalink('p', b)]);
    const homepage = await publicPosts('homepage=1');
    expect(homepage).toContain(permalink('p', a));
    expect(homepage).not.toContain(permalink('p', b));
    expect(homepage.length).toBeLessThanOrEqual(6);

    // Reorder
    expect((await admin.patch(`/api/admin/instagram/posts/${idB}`, { data: { move: 'up' } })).status()).toBe(200);
    expect(await publicPosts(`talent=${talent.id}`)).toEqual([permalink('p', b), permalink('p', a)]);

    // Hidden posts are hidden everywhere
    await admin.patch(`/api/admin/instagram/posts/${idA}`, { data: { is_visible: false } });
    expect(await publicPosts(`talent=${talent.id}`)).toEqual([permalink('p', b)]);
    expect(await publicPosts('homepage=1')).not.toContain(permalink('p', a));

    // Given to VersaTalent itself: it leaves the talent's profile
    await admin.patch(`/api/admin/instagram/posts/${idA}`, { data: { is_visible: true, talent_id: null } });
    expect(await publicPosts(`talent=${talent.id}`)).toEqual([permalink('p', b)]);
    const agency = (await (await admin.get('/api/admin/instagram/posts')).json()).data.find((p: { id: string }) => p.id === idA);
    expect(agency.talent).toBeNull();

    // A talent taken off the site takes their posts with them
    await sql`UPDATE talents SET is_active = false WHERE id = ${talent.id}`;
    expect(await publicPosts(`talent=${talent.id}`)).toEqual([]);
    await sql`UPDATE talents SET is_active = true WHERE id = ${talent.id}`;

    // Removing
    expect((await admin.delete(`/api/admin/instagram/posts/${idB}`)).status()).toBe(200);
    expect(await publicPosts(`talent=${talent.id}`)).toEqual([]);
    expect((await admin.delete(`/api/admin/instagram/posts/${idB}`)).status()).toBe(404);
    await admin.delete(`/api/admin/instagram/posts/${idA}`);
  });

  test('only admins can manage posts', async () => {
    const talent = await createTalent();
    const manager = await createTeamUser('manager', [talent.id]);
    const someId = '00000000-0000-4000-8000-000000000000';
    const calls = async (api: Awaited<ReturnType<typeof anonymousApi>>) => [
      (await api.get('/api/admin/instagram/posts')).status(),
      (await api.post('/api/admin/instagram/posts', { data: { url: permalink('p', code()), talent_id: null } })).status(),
      (await api.patch(`/api/admin/instagram/posts/${someId}`, { data: { is_visible: false } })).status(),
      (await api.delete(`/api/admin/instagram/posts/${someId}`)).status(),
    ];
    expect(await calls(await anonymousApi())).toEqual([401, 401, 401, 401]);
    expect(await calls(await teamApi(manager.email, manager.password))).toEqual([403, 403, 403, 403]);

    const api = await anonymousApi();
    expect((await api.get('/api/instagram/posts')).status()).toBe(400);
    expect((await api.get('/api/instagram/posts?talent=not-an-id')).status()).toBe(404);
  });

  test('a talent’s profile shows their posts, and only when they have some', async ({ page }) => {
    const [withPosts, without] = [await createTalent(), await createTalent()];
    const admin = await adminApi();
    const post = code();
    await admin.post('/api/admin/instagram/posts', {
      data: { url: permalink('reel', post), talent_id: withPosts.id, on_homepage: false },
    });

    // Instagram's embed script isn't loaded in tests; the post falls back to a link
    await page.route('**://www.instagram.com/**', (route) => route.abort());

    await page.goto(`/talents/${withPosts.id}`);
    const heading = page.getByRole('heading', { name: 'On Instagram' });
    await heading.scrollIntoViewIfNeeded();
    await expect(heading).toBeVisible();
    await expect(page.locator(`a[href="${permalink('reel', post)}"]`).first()).toBeVisible();

    // Wait until the profile has asked for posts before checking there are none
    const asked = page.waitForResponse((r) => r.url().includes(`/api/instagram/posts?talent=${without.id}`));
    await page.goto(`/talents/${without.id}`);
    await asked;
    // The name is on the page more than once, some copies hidden at this size
    await expect(page.getByText(without.name, { exact: true }).filter({ visible: true }).first()).toBeVisible();
    await expect(page.getByRole('heading', { name: 'On Instagram' })).toHaveCount(0);
  });
});
