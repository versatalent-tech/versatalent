import { test, expect } from '@playwright/test';
import { createTalent, createTeamUser } from '../support/db';
import { anonymousApi, teamApi } from '../support/auth';

const ADMIN_ONLY_APIS = [
  ['GET', '/api/admin/tickets/events'],
  ['GET', '/api/admin/tickets/orders'],
  ['GET', '/api/admin/referrals'],
];

test.describe('Who can see what', () => {
  test('signed-out visitors get nothing from team APIs', async () => {
    const api = await anonymousApi();
    for (const [, path] of [...ADMIN_ONLY_APIS, ['GET', '/api/crm/options'], ['GET', '/api/crm/kpis']]) {
      expect((await api.get(path)).status(), path).toBe(401);
    }
  });

  test('a manager can use the CRM but not admin-only sections', async ({ page }) => {
    const talent = await createTalent();
    const manager = await createTeamUser('manager', [talent.id]);
    const api = await teamApi(manager.email, manager.password);

    expect((await api.get('/api/crm/options')).status()).toBe(200);
    for (const [, path] of ADMIN_ONLY_APIS) {
      expect((await api.get(path)).status(), path).toBe(403);
    }
    expect([401, 403]).toContain((await api.get(`/api/talents/${talent.id}/stats`)).status());

    // Admin-only pages send managers back to their dashboard
    await page.context().addCookies((await api.storageState()).cookies);
    await page.goto('/admin/tickets');
    await expect(page).toHaveURL(/\/admin$/);
  });

  test('signed-out visitors are sent to the sign-in page', async ({ page }) => {
    await page.goto('/admin');
    await expect(page).toHaveURL(/\/admin\/login/);
  });
});
