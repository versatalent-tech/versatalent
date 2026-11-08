import { test, expect } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { createTalent, createTalentLogin, sql } from '../support/db';
import {
  activeTalentUserIds,
  markNotificationsRead,
  saveNotifications,
} from '../../src/lib/db/repositories/notifications';

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
