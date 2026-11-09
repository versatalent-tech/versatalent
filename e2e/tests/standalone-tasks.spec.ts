import { test, expect, type APIRequestContext, type Page } from '@playwright/test';
import { createOrganisation, createTalent, createTalentLogin, createTeamUser, sql, uniq } from '../support/db';
import { adminApi, portalApi, teamApi } from '../support/auth';

/**
 * CRM → Tasks: a task can be added on its own (no meeting, deal or client
 * needed) and given to someone, optionally linked to a client or deal.
 */
async function signIn(page: Page, api: APIRequestContext) {
  await page.context().addCookies((await api.storageState()).cookies);
}

async function managerWithTalent() {
  const talent = await createTalent({ name: uniq('E2E Task Talent') });
  const login = await createTalentLogin(talent.id, 'E2E Real Name');
  const manager = await createTeamUser('manager', [talent.id]);
  return { talent, login, manager };
}

test.describe('Standalone tasks', () => {
  test('a manager gives a talent a task from CRM → Tasks', async ({ page }) => {
    const { talent, login, manager } = await managerWithTalent();
    await signIn(page, await teamApi(manager.email, manager.password));
    await page.goto('/admin/crm/tasks');
    await page.getByRole('button', { name: 'New task' }).click();

    const subject = uniq('Send the press shots');
    const dialog = page.getByRole('dialog');
    await dialog.getByLabel('What needs doing').fill(subject);
    await dialog.getByLabel('For').selectOption({ label: `${talent.name} (E2E Real Name)` });
    await dialog.getByRole('button', { name: 'Add task' }).click();

    // Listed straight away (the list switches to everyone's, as it's not mine)
    await expect(page.getByText(subject)).toBeVisible();

    // In the talent's portal to-dos, with a notification
    const portal = await portalApi(login.email, login.password);
    const todos = (await (await portal.get('/api/portal/tasks')).json()).data;
    expect(todos.map((t: { subject: string }) => t.subject)).toContain(subject);
    const notes = await sql`SELECT kind FROM notifications WHERE user_id = ${login.id} AND body LIKE ${subject + '%'}`;
    expect(notes.map((n) => n.kind)).toEqual(['task_assigned']);

    // No client or deal
    const [task] = await sql`SELECT deal_id, organisation_id FROM activities WHERE subject = ${subject}`;
    expect(task).toEqual({ deal_id: null, organisation_id: null });
  });

  test('a task linked to a deal shows on the deal page', async ({ page }) => {
    const admin = await adminApi();
    const client = await createOrganisation();
    const dealTitle = uniq('E2E Task Deal');
    const created = await admin.post('/api/crm/deals', { data: { title: dealTitle, organisation_id: client.id } });
    expect(created.status(), await created.text()).toBe(201);
    const dealId = (await created.json()).data.id;

    await signIn(page, admin);
    await page.goto('/admin/crm/tasks');
    await page.getByRole('button', { name: 'New task' }).click();
    const subject = uniq('Chase the contract');
    const dialog = page.getByRole('dialog');
    await dialog.getByLabel('What needs doing').fill(subject);
    await dialog.getByLabel('Deal').selectOption(dealId);
    // Choosing the deal fills in its client
    await expect(dialog.getByLabel('Client')).toHaveValue(client.id);
    await dialog.getByRole('button', { name: 'Add task' }).click();
    await expect(page.getByText(subject)).toBeVisible();

    const [task] = await sql`SELECT deal_id, organisation_id FROM activities WHERE subject = ${subject}`;
    expect(task).toEqual({ deal_id: dealId, organisation_id: client.id });
    await page.goto(`/admin/crm/deals/${dealId}`);
    await expect(page.getByText(subject)).toBeVisible();
  });

  test('a manager can only give tasks to their own talents', async ({ page }) => {
    const { manager } = await managerWithTalent();
    const other = await createTalent({ name: uniq('E2E Not Theirs') });
    const otherLogin = await createTalentLogin(other.id);
    await signIn(page, await teamApi(manager.email, manager.password));
    await page.goto('/admin/crm/tasks');
    await page.getByRole('button', { name: 'New task' }).click();
    await expect(page.getByRole('dialog').getByLabel('For').locator('option', { hasText: other.name })).toHaveCount(0);

    const api = await teamApi(manager.email, manager.password);
    const refused = await api.post('/api/crm/activities', {
      data: { type: 'task', subject: 'Not yours', due_at: new Date(Date.now() + 86_400_000).toISOString(), owner_user_id: otherLogin.id },
    });
    expect(refused.status()).toBe(400);
  });
});
