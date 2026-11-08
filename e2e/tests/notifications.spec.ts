import { test, expect } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { createTalent, createTalentLogin, sql, uniq } from '../support/db';
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
