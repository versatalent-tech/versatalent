import { test, expect, type Page } from '@playwright/test';
import { randomBytes } from 'node:crypto';
import { createEvent, createMember, createTeamUser, pointsFor, sql } from '../support/db';
import { ADMIN_STATE } from '../support/env';

/**
 * A pretend Android phone: Chrome's Web NFC (NDEFReader), with window.__tap()
 * holding a card to it. `granted` = NFC already allowed for the site.
 */
async function pretendPhone(page: Page, granted = false) {
  await page.addInitScript((alreadyAllowed) => {
    const listeners: ((e: { serialNumber: string }) => void)[] = [];
    (window as any).__scans = 0;
    (window as any).NDEFReader = class {
      addEventListener(type: string, fn: (e: { serialNumber: string }) => void) {
        if (type === 'reading') listeners.push(fn);
      }
      async scan() {
        (window as any).__scans++;
      }
    };
    (window as any).__tap = (serialNumber: string) => listeners.forEach((fn) => fn({ serialNumber }));
    const query = navigator.permissions.query.bind(navigator.permissions);
    navigator.permissions.query = ((d: PermissionDescriptor) =>
      d.name === ('nfc' as PermissionName)
        ? Promise.resolve({ state: alreadyAllowed ? 'granted' : 'prompt' } as PermissionStatus)
        : query(d)) as typeof navigator.permissions.query;
  }, granted);
}

/** Sign the page in to the till (it only accepts a staff sign-in) */
async function signInToTill(page: Page) {
  const staff = await createTeamUser('staff');
  const response = await page.request.post('/api/staff/login', { data: { email: staff.email, password: staff.password } });
  expect(response.ok(), await response.text()).toBe(true);
}

/** A member's card, with the id as Chrome reports it (colon-separated, lower case) */
async function memberCard() {
  const member = await createMember();
  const bytes = randomBytes(7);
  bytes[0] = 0x04;
  const uid = bytes.toString('hex').toUpperCase();
  await sql`INSERT INTO nfc_cards (card_uid, user_id, type) VALUES (${uid}, ${member.id}, 'vip')`;
  return { member, serial: bytes.toString('hex').match(/../g)!.join(':') };
}

test.describe('Tapping cards on an Android phone or tablet', () => {
  test.use({ storageState: ADMIN_STATE });

  test('rewards: switch on phone tap, then a tap finds the member', async ({ page }) => {
    const { serial } = await memberCard();
    await pretendPhone(page);
    await page.goto('/staff/rewards');

    await page.getByRole('button', { name: 'Tap cards on this device' }).click();
    await expect(page.getByText('Phone tap is on')).toBeVisible();
    await page.evaluate((s) => (window as any).__tap(s), serial);
    await expect(page.getByText('E2E Member')).toBeVisible();
    await expect(page.getByText('points to spend')).toBeVisible();
  });

  test('door: once allowed it switches itself on, and a tap checks the member in', async ({ page }) => {
    const { member, serial } = await memberCard();
    const event = await createEvent({ startsInDays: 0 });
    await sql`INSERT INTO nfc_events (name, date, is_active, event_id) VALUES (${event.title}, NOW(), true, ${event.id})`;
    await pretendPhone(page, true);
    await page.goto(`/staff/event-day/${event.id}`);

    await expect(page.getByText('Phone tap is on')).toBeVisible();
    await expect(page.getByText('Phone tap ready').first()).toBeVisible();
    await page.evaluate((s) => (window as any).__tap(s), serial);
    await expect(page.getByText('E2E Member').first()).toBeVisible();
    await expect.poll(async () => (await pointsFor(member.id)).status).toBeGreaterThan(0);
  });

  test('till: switch on phone tap, then a tap links the customer to the sale', async ({ page }) => {
    const { serial } = await memberCard();
    await pretendPhone(page);
    await signInToTill(page);
    await page.goto('/staff/pos');

    await page.getByRole('button', { name: 'Tap cards on this device' }).click();
    await expect(page.getByText('Phone tap is on')).toBeVisible();
    await page.evaluate((s) => (window as any).__tap(s), serial);
    await expect(page.getByText('E2E Member', { exact: true })).toBeVisible();
  });

  test('till: the header links to Rewards and Logout is readable', async ({ page }) => {
    await signInToTill(page);
    await page.goto('/staff/pos');
    // The outline button used to fill white behind its white text
    await expect(page.getByRole('button', { name: 'Logout' })).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
    await page.getByRole('link', { name: 'Rewards' }).click();
    await expect(page).toHaveURL(/\/staff\/rewards$/);
  });

  test('on an iPhone, iPad or computer there is no phone tap button', async ({ page }) => {
    await page.goto('/staff/rewards');
    await expect(page.getByRole('heading', { name: 'Rewards' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Tap cards on this device' })).toHaveCount(0);
  });
});
