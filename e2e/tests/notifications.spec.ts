import { test, expect } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { createTalent, createTalentLogin, createTeamUser, sql, uniq } from '../support/db';
import { adminApi, portalApi } from '../support/auth';
import { pushDevice, pushRequests } from '../support/push';
import {
  activeTalentUserIds,
  markNotificationsRead,
  saveNotifications,
  savePushDevice,
} from '../../src/lib/db/repositories/notifications';
import { notify, notifyTalent } from '../../src/lib/notifications/notify';

const aMessage = () => ({ kind: 'task_assigned' as const, title: 'New to-do', body: uniq('Send the mix'), link: '/portal' });

async function addDevice(userId: string, id: string) {
  await savePushDevice(userId, { ...pushDevice(id), userAgent: 'e2e' });
}

async function talentUser() {
  const talent = await createTalent();
  const login = await createTalentLogin(talent.id);
  return { talentId: talent.id, ...login };
}

test.describe('Notification storage', () => {
  test('saving with the same dedupe key twice keeps one row', async () => {
    const user = await talentUser();
    const message = { kind: 'task_due' as const, title: 'Due tomorrow', body: 'Send the mix', link: '/portal', dedupeKey: `test:${randomUUID()}` };
    const first = await saveNotifications([user.id], message);
    const second = await saveNotifications([user.id], message);
    expect([first.length, second.length]).toEqual([1, 0]);
  });

  test('marking read only touches your own', async () => {
    const a = await talentUser();
    const b = await talentUser();
    const [row] = await saveNotifications([b.id], { kind: 'task_assigned', title: 'New to-do', body: 'x', link: '/portal' });
    expect(await markNotificationsRead(a.id, [row.id])).toBe(0);
    const [stored] = await sql`SELECT read_at FROM notifications WHERE id = ${row.id}`;
    expect(stored.read_at).toBeNull();
  });

  test('activeTalentUserIds skips inactive logins', async () => {
    // A talent has at most one login (idx_users_talent_id_unique)
    const user = await talentUser();
    expect(await activeTalentUserIds(user.talentId)).toEqual([user.id]);
    await sql`UPDATE users SET is_active = false WHERE id = ${user.id}`;
    expect(await activeTalentUserIds(user.talentId)).toEqual([]);
  });
});

test.describe('notify', () => {
  test('notify saves a row and pushes to each device', async () => {
    const user = await talentUser();
    const ids = [uniq('phone'), uniq('tablet')];
    for (const id of ids) await addDevice(user.id, id);
    const message = aMessage();
    await notify([user.id], message);

    const sent = (await pushRequests()).filter((r) => ids.includes(r.id));
    expect(sent).toHaveLength(2);
    expect(sent.every((r) => r.authorization)).toBe(true);
    const rows = await sql`SELECT title, body, pushed_at FROM notifications WHERE user_id = ${user.id}`;
    expect(rows).toHaveLength(1);
    expect(rows[0].body).toBe(message.body);
    expect(rows[0].pushed_at).not.toBeNull();
  });

  test('a gone device is removed', async () => {
    const user = await talentUser();
    await addDevice(user.id, uniq('gone-x'));
    await notify([user.id], aMessage());
    expect(await sql`SELECT id FROM push_subscriptions WHERE user_id = ${user.id}`).toHaveLength(0);
  });

  test("a slow push service doesn't hang notify", async () => {
    const user = await talentUser();
    await addDevice(user.id, uniq('slow-x'));
    const started = Date.now();
    await notify([user.id], aMessage());
    expect(Date.now() - started).toBeLessThan(7_000);
    const [row] = await sql`SELECT pushed_at FROM notifications WHERE user_id = ${user.id}`;
    expect(row.pushed_at).toBeNull();
  });

  test('notifyTalent with no active login does nothing', async () => {
    const talent = await createTalent();
    await expect(notifyTalent(talent.id, aMessage())).resolves.toBeUndefined();
    const user = await talentUser();
    await sql`UPDATE users SET is_active = false WHERE id = ${user.id}`;
    await notifyTalent(user.talentId, aMessage());
    expect(await sql`SELECT id FROM notifications WHERE user_id = ${user.id}`).toHaveLength(0);
  });
});

test.describe('Portal', () => {
  async function seed(userId: string, count: number) {
    for (let i = 0; i < count; i++) await saveNotifications([userId], aMessage());
  }

  test('bell shows unread count and clears on open', async ({ page }) => {
    const user = await talentUser();
    await seed(user.id, 3);
    const portal = await portalApi(user.email, user.password);
    await page.context().addCookies((await portal.storageState()).cookies);
    await page.goto('/portal');

    const bell = page.getByRole('button', { name: /Notifications/ });
    await expect(bell).toContainText('3');
    await bell.click();
    await expect(page.getByText('New to-do')).toHaveCount(3);
    await expect(bell).not.toContainText('3');
    // The badge clears at once; marking them read on the server follows
    const list = async () => (await (await portal.get('/api/portal/notifications')).json()).data;
    await expect.poll(async () => (await list()).unread).toBe(0);
    expect((await list()).items).toHaveLength(3);
  });

  test('badge shows 9+', async ({ page }) => {
    const user = await talentUser();
    await seed(user.id, 12);
    const portal = await portalApi(user.email, user.password);
    await page.context().addCookies((await portal.storageState()).cookies);
    await page.goto('/portal');
    await expect(page.getByRole('button', { name: /Notifications/ })).toContainText('9+');
  });

  test("talent can't read or mark another user's notifications or remove their device", async () => {
    const a = await talentUser();
    const b = await talentUser();
    const [row] = await saveNotifications([a.id], aMessage());
    const device = pushDevice(uniq('phone'));
    await savePushDevice(a.id, { ...device, userAgent: 'e2e' });

    const portalB = await portalApi(b.email, b.password);
    expect((await (await portalB.get('/api/portal/notifications')).json()).data.items).toHaveLength(0);
    await portalB.post('/api/portal/notifications/read', { data: { ids: [row.id] } });
    const [stored] = await sql`SELECT read_at FROM notifications WHERE id = ${row.id}`;
    expect(stored.read_at).toBeNull();

    const removed = await portalB.delete('/api/portal/push', { data: { endpoint: device.endpoint } });
    expect(removed.status()).toBe(404);
    expect(await sql`SELECT id FROM push_subscriptions WHERE endpoint = ${device.endpoint}`).toHaveLength(1);
  });

  test('saving a device via the API stores it', async ({ request }) => {
    const user = await talentUser();
    const portal = await portalApi(user.email, user.password);
    const device = pushDevice(uniq('phone'));
    const saved = await portal.post('/api/portal/push', { data: { endpoint: device.endpoint, keys: { p256dh: device.p256dh, auth: device.auth } } });
    expect(saved.ok()).toBe(true);
    expect(await sql`SELECT user_id FROM push_subscriptions WHERE endpoint = ${device.endpoint}`).toEqual([{ user_id: user.id }]);
    expect((await (await portal.get('/api/portal/push/key')).json()).data.key).toBeTruthy();
    expect((await request.get('/api/portal/notifications')).status()).toBe(401);

    // Only browsers' push services, so the server can't be pointed anywhere else
    const elsewhere = await portal.post('/api/portal/push', { data: { endpoint: 'https://example.com/hook', keys: { p256dh: device.p256dh, auth: device.auth } } });
    expect(elsewhere.status()).toBe(400);
  });
});

/** Notifications a user has, oldest first */
async function notificationsFor(userId: string) {
  return sql`SELECT kind, title, body, link FROM notifications WHERE user_id = ${userId} ORDER BY created_at, id`;
}

test.describe('Triggers', () => {
  const dueTomorrow = () => new Date(Date.now() + 86_400_000).toISOString();

  test('giving a task to a talent notifies them', async () => {
    const user = await talentUser();
    const admin = await adminApi();
    const subject = uniq('Send the mix');
    const created = await admin.post('/api/crm/activities', { data: { type: 'task', subject, due_at: dueTomorrow(), owner_user_id: user.id } });
    expect(created.status(), await created.text()).toBe(201);
    expect(await notificationsFor(user.id)).toEqual([expect.objectContaining({ kind: 'task_assigned', title: 'New to-do', link: '/portal' })]);
    expect((await notificationsFor(user.id))[0].body).toContain(subject);
  });

  test('re-assigning notifies the new owner only', async () => {
    const first = await talentUser();
    const second = await talentUser();
    const admin = await adminApi();
    const created = await admin.post('/api/crm/activities', { data: { type: 'task', subject: uniq('Task'), due_at: dueTomorrow(), owner_user_id: first.id } });
    const id = (await created.json()).data.id;
    await admin.patch(`/api/crm/activities/${id}`, { data: { owner_user_id: second.id } });
    expect(await notificationsFor(first.id)).toHaveLength(1);
    expect(await notificationsFor(second.id)).toHaveLength(1);
    // Editing anything else doesn't notify again
    await admin.patch(`/api/crm/activities/${id}`, { data: { subject: uniq('Renamed') } });
    expect(await notificationsFor(second.id)).toHaveLength(1);
  });

  test("a task for a road manager doesn't notify", async () => {
    const roadManager = await createTeamUser('road_manager');
    const admin = await adminApi();
    const created = await admin.post('/api/crm/activities', { data: { type: 'task', subject: uniq('Van'), due_at: dueTomorrow(), owner_user_id: roadManager.id } });
    expect(created.status(), await created.text()).toBe(201);
    expect(await notificationsFor(roadManager.id)).toHaveLength(0);
  });
});
