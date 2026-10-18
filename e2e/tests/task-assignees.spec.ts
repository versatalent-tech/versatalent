import { test, expect } from '@playwright/test';
import { createTalent, createTalentLogin, createTeamUser, sql } from '../support/db';
import { adminApi, portalApi, teamApi } from '../support/auth';

/**
 * Meeting action items (and tasks) can be given to road managers and to
 * talents with a portal login, who then see them on their dashboard or in
 * the portal and can tick them off.
 */
test.describe('Giving tasks to road managers and talents', () => {
  test('from a meeting to the road manager’s dashboard and the talent’s portal', async ({ page }) => {
    const talent = await createTalent({ name: 'E2E DJ Stage Name' });
    const login = await createTalentLogin(talent.id, 'E2E Real Name');
    const roadManager = await createTeamUser('road_manager');
    const admin = await adminApi();

    // Both appear in the "who does this" list, grouped
    const options = (await (await admin.get('/api/crm/options')).json()).data;
    expect(options.assignees).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: roadManager.id, group: 'road_manager' }),
        expect.objectContaining({ id: login.id, group: 'talent', name: 'E2E DJ Stage Name (E2E Real Name)', talent_id: talent.id }),
      ])
    );

    // A meeting with two action items, then turned into tasks
    const created = await admin.post('/api/crm/meetings', {
      data: { title: 'E2E weekly meeting', starts_at: new Date().toISOString(), talent_ids: [talent.id] },
    });
    expect(created.status(), await created.text()).toBeLessThan(300);
    const meetingId = (await created.json()).data.id;
    const items = [
      { id: 'rm', title: 'Book the van for Saturday', owner_user_id: roadManager.id, owner_name: 'Road manager' },
      { id: 'dj', title: 'Send your set list', owner_user_id: login.id, owner_name: 'E2E DJ Stage Name (E2E Real Name)' },
    ];
    const saved = await admin.patch(`/api/crm/meetings/${meetingId}`, { data: { action_items: items } });
    expect(saved.status(), await saved.text()).toBe(200);
    const tasks = await admin.post(`/api/crm/meetings/${meetingId}/tasks`, { data: { item_ids: ['rm', 'dj'] } });
    expect((await tasks.json()).message).toBe('2 tasks added');

    // The road manager sees theirs on the dashboard, with where it came from, and ticks it off
    const rm = await teamApi(roadManager.email, roadManager.password);
    const mine = (await (await rm.get('/api/tasks/mine')).json()).data;
    expect(mine).toEqual([expect.objectContaining({ subject: 'Book the van for Saturday', source: 'From the meeting “E2E weekly meeting”', completed_at: null })]);

    await page.context().addCookies((await rm.storageState()).cookies);
    await page.goto('/admin');
    await expect(page.getByRole('heading', { name: /Your tasks/ })).toBeVisible();
    await page.getByRole('checkbox', { name: 'Done: Book the van for Saturday' }).click();
    await expect(page.getByRole('checkbox', { name: 'Reopen: Book the van for Saturday' })).toBeChecked();

    // The talent sees theirs in the portal, without the meeting or client details
    const portal = await portalApi(login.email, login.password);
    const todos = (await (await portal.get('/api/portal/tasks')).json()).data;
    expect(todos).toEqual([expect.objectContaining({ subject: 'Send your set list', source: null })]);
    expect((await portal.patch(`/api/portal/tasks/${todos[0].id}`, { data: { completed: true } })).status()).toBe(200);

    // The team sees both as done
    const done = await sql`SELECT subject, completed_at FROM activities WHERE subject IN ('Book the van for Saturday', 'Send your set list') ORDER BY subject`;
    expect(done.every((row: any) => row.completed_at)).toBe(true);
  });

  test('people can only tick off their own tasks', async () => {
    const talent = await createTalent();
    const login = await createTalentLogin(talent.id);
    const other = await createTalentLogin((await createTalent()).id);
    const admin = await adminApi();
    const task = await admin.post('/api/crm/activities', {
      data: { type: 'task', subject: 'E2E only mine', due_at: new Date(Date.now() + 86_400_000).toISOString(), owner_user_id: login.id },
    });
    expect(task.status(), await task.text()).toBe(201);
    const taskId = (await task.json()).data.id;

    const otherPortal = await portalApi(other.email, other.password);
    expect((await otherPortal.patch(`/api/portal/tasks/${taskId}`, { data: { completed: true } })).status()).toBe(404);
    expect((await (await otherPortal.get('/api/portal/tasks')).json()).data).toEqual([]);

    const roadManager = await createTeamUser('road_manager');
    const rm = await teamApi(roadManager.email, roadManager.password);
    expect((await rm.patch(`/api/tasks/mine/${taskId}`, { data: { completed: true } })).status()).toBe(404);
  });

  test('a manager can give tasks to their own talents only', async () => {
    const mine = await createTalent();
    const notMine = await createTalent();
    const mineLogin = await createTalentLogin(mine.id);
    const notMineLogin = await createTalentLogin(notMine.id);
    const manager = await createTeamUser('manager', [mine.id]);
    const api = await teamApi(manager.email, manager.password);

    const ids = (await (await api.get('/api/crm/options')).json()).data.assignees.map((a: { id: string }) => a.id);
    expect(ids).toContain(mineLogin.id);
    expect(ids).not.toContain(notMineLogin.id);

    const task = (subject: string, owner: string) =>
      api.post('/api/crm/activities', { data: { type: 'task', subject, due_at: new Date().toISOString(), owner_user_id: owner } });
    expect((await task('E2E for my talent', mineLogin.id)).status()).toBe(201);
    const refused = await task('E2E for someone else’s talent', notMineLogin.id);
    expect((await refused.json()).error).toBe('Tasks can be given to the team, road managers and your talents with a portal login');
  });
});
