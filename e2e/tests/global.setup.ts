import { test as setup, expect } from '@playwright/test';
import { ADMIN, ADMIN_STATE } from '../support/env';

/**
 * Runs once before the tests: signs in as the admin (saved for tests that
 * need it) and opens the main pages so `next dev` has compiled them.
 */
setup('sign in as admin', async ({ request }) => {
  const response = await request.post('/api/admin/auth/login', { data: ADMIN });
  expect(response.status(), await response.text()).toBe(200);
  await request.storageState({ path: ADMIN_STATE });
});

setup('warm up pages', async ({ request }) => {
  setup.setTimeout(300_000);
  // First visits make `next dev` compile each route, which can take a while
  const paths = [
    '/', '/talents', '/events', '/membership', '/membership/terms', '/privacy', '/tickets/terms', '/admin/login',
    '/talents/00000000-0000-4000-8000-000000000000', '/events/00000000-0000-4000-8000-000000000000',
    '/events/00000000-0000-4000-8000-000000000000/tickets', '/tickets/order/00000000-0000-4000-8000-000000000000',
    '/api/talents', '/api/events', '/api/talents/00000000-0000-4000-8000-000000000000',
    '/api/events/00000000-0000-4000-8000-000000000000/tickets', '/api/tickets/orders/00000000-0000-4000-8000-000000000000',
  ];
  for (const path of paths) {
    const response = await request.get(path, { timeout: 120_000 });
    expect(response.status(), path).toBeLessThan(500);
  }
});

setup('warm up admin pages', async ({ browser }) => {
  setup.setTimeout(300_000);
  const context = await browser.newContext({ storageState: ADMIN_STATE });
  const page = await context.newPage();
  for (const path of ['/admin', '/admin/tickets', '/api/admin/tickets/orders', '/api/admin/tickets/events']) {
    // Compiled once the HTML arrives; no need to wait for every image
    await page.goto(path, { timeout: 120_000, waitUntil: 'domcontentloaded' });
  }
  await context.close();
});
