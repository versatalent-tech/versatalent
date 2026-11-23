import { test, expect } from '@playwright/test';
import { createTalent, createTalentLogin, createTeamUser, sql, uniq } from '../support/db';
import { adminApi, anonymousApi, portalApi, teamApi } from '../support/auth';
import { pushDevice, pushRequests } from '../support/push';

/**
 * Phone notifications for team members: each phone or browser switches them
 * on from /admin/notifications, through /api/admin/push and the /admin
 * service worker. The talent portal keeps its own (/api/portal/push).
 */

const body = (device: ReturnType<typeof pushDevice>) => ({ endpoint: device.endpoint, keys: { p256dh: device.p256dh, auth: device.auth } });

async function devicesFor(userId: string) {
  return sql`SELECT endpoint FROM push_subscriptions WHERE user_id = ${userId}`;
}

test.describe('Team push API', () => {
  test('a team member switches a device on and off', async () => {
    const manager = await createTeamUser('manager');
    const api = await teamApi(manager.email, manager.password);

    const key = await api.get('/api/admin/push/key');
    expect(key.status()).toBe(200);
    expect((await key.json()).data.key).toEqual(expect.any(String));

    const device = pushDevice(uniq('team-phone'));
    const saved = await api.post('/api/admin/push', { data: body(device) });
    expect(saved.status(), await saved.text()).toBe(200);
    expect(await devicesFor(manager.id)).toEqual([{ endpoint: device.endpoint }]);

    // Only real push services (and the tests' pretend one) are accepted
    const elsewhere = await api.post('/api/admin/push', { data: { ...body(device), endpoint: 'https://example.com/hook' } });
    expect(elsewhere.status()).toBe(400);

    const removed = await api.delete('/api/admin/push', { data: { endpoint: device.endpoint } });
    expect(removed.status(), await removed.text()).toBe(200);
    expect(await devicesFor(manager.id)).toEqual([]);
  });

  test("you can't switch off someone else's device", async () => {
    const owner = await createTeamUser('road_manager');
    const other = await createTeamUser('manager');
    const device = pushDevice(uniq('their-phone'));
    await (await teamApi(owner.email, owner.password)).post('/api/admin/push', { data: body(device) });
    const res = await (await teamApi(other.email, other.password)).delete('/api/admin/push', { data: { endpoint: device.endpoint } });
    expect(res.status()).toBe(404);
    expect(await devicesFor(owner.id)).toHaveLength(1);
  });

  test('signed-out visitors and talents are turned away; the env admin has no account to save to', async () => {
    const device = body(pushDevice(uniq('nobody')));
    const anonymous = await anonymousApi();
    expect((await anonymous.get('/api/admin/push/key')).status()).toBe(401);
    expect((await anonymous.post('/api/admin/push', { data: device })).status()).toBe(401);

    const talent = await createTalent();
    const login = await createTalentLogin(talent.id);
    const portal = await portalApi(login.email, login.password);
    expect((await portal.post('/api/admin/push', { data: device })).status()).toBe(401);

    const envAdmin = await adminApi();
    expect((await envAdmin.get('/api/admin/push/key')).status()).toBe(404);
    expect((await envAdmin.post('/api/admin/push', { data: device })).status()).toBe(400);
  });

  test('a task given to a team member is pushed to their device', async () => {
    const roadManager = await createTeamUser('road_manager');
    const id = uniq('team-push');
    await (await teamApi(roadManager.email, roadManager.password)).post('/api/admin/push', { data: body(pushDevice(id)) });

    const subject = uniq('Load the van');
    const res = await (await adminApi()).post('/api/crm/activities', {
      data: { type: 'task', subject, due_at: new Date(Date.now() + 86_400_000).toISOString(), owner_user_id: roadManager.id },
    });
    expect(res.status(), await res.text()).toBe(201);

    expect((await pushRequests()).filter((r) => r.id === id)).toEqual([expect.objectContaining({ authorization: true })]);
    const [row] = await sql`SELECT link, pushed_at FROM notifications WHERE user_id = ${roadManager.id}`;
    expect(row.link).toBe('/admin');
    expect(row.pushed_at).not.toBeNull();
  });
});

test.describe('Team push on the admin pages', () => {
  test('the service worker and Home Screen manifest are served for /admin', async () => {
    const anonymous = await anonymousApi();
    const worker = await anonymous.get('/admin-sw.js');
    expect(worker.status()).toBe(200);
    const script = await worker.text();
    expect(script).toContain("startsWith('/admin')");
    expect(script).not.toContain('/portal');

    const manifest = await (await anonymous.get('/admin.webmanifest')).json();
    expect(manifest).toMatchObject({ start_url: '/admin', scope: '/admin' });
  });

  test('the notifications page offers phone notifications and links the manifest', async ({ page }) => {
    const manager = await createTeamUser('manager');
    const api = await teamApi(manager.email, manager.password);
    await page.context().addCookies((await api.storageState()).cookies);
    // Playwright's headless shell always reports notifications as blocked; act like a browser that hasn't been asked yet
    await page.addInitScript(() => Object.defineProperty(Notification, 'permission', { get: () => 'default' }));
    await page.goto('/admin/notifications');
    await expect(page.locator('link[rel="manifest"]')).toHaveAttribute('href', '/admin.webmanifest');
    const card = page.getByRole('region', { name: 'Phone notifications' });
    await expect(card.getByText('Get notifications on this phone')).toBeVisible();
    await expect(card.getByText('Tasks, bookings for your talents')).toBeVisible();
    await expect(card.getByRole('button', { name: 'Turn on' })).toBeVisible();
  });

  test('when the browser blocks notifications, the card says how to allow them', async ({ page }) => {
    const manager = await createTeamUser('manager');
    const api = await teamApi(manager.email, manager.password);
    await page.context().addCookies((await api.storageState()).cookies);
    await page.goto('/admin/notifications');
    await expect(page.getByRole('region', { name: 'Phone notifications' }).getByText('Notifications are blocked for this site')).toBeVisible();
  });
});
