import { test, expect } from '@playwright/test';
import { createEvent, createTalent, createTicketType } from '../support/db';
import { ADMIN_STATE } from '../support/env';

test.describe('Pages load without errors', () => {
  test('public pages', async ({ page }) => {
    const talent = await createTalent();
    const event = await createEvent({ talentIds: [talent.id] });
    await createTicketType(event.id);

    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(`${page.url()}: ${error.message}`));

    for (const path of [
      '/',
      '/talents',
      `/talents/${talent.id}`,
      '/events',
      `/events/${event.id}`,
      `/events/${event.id}/tickets`,
      '/membership',
      '/membership/terms',
      '/tickets/terms',
      '/privacy',
    ]) {
      const response = await page.goto(path);
      expect(response?.status(), path).toBeLessThan(400);
      await expect(page.locator('main, body').first()).toBeVisible();
    }
    expect(errors).toEqual([]);
  });

  test('the ticket page fits a phone screen', async ({ page }) => {
    const event = await createEvent();
    await createTicketType(event.id);
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(`/events/${event.id}/tickets`);
    await expect(page.getByRole('heading', { name: event.title })).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });

  test.describe('signed in as admin', () => {
    test.use({ storageState: ADMIN_STATE });
    test('dashboard links to the main sections', async ({ page }) => {
      await page.goto('/admin');
      for (const name of ['Tickets', 'Talents', 'Events', 'VIP programme']) {
        await expect(page.getByRole('link', { name: new RegExp(name) }).first()).toBeVisible();
      }
    });
  });
});
