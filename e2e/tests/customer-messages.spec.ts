import { test, expect, type APIRequestContext } from '@playwright/test';
import { createEvent, createTeamUser, sql } from '../support/db';
import { adminApi, anonymousApi, teamApi } from '../support/auth';
import { paidOrder } from '../support/tickets';

/**
 * Customer messages: ticket buyers to message by hand (confirmation once the
 * PDF is made, a reminder before the event, a follow-up afterwards), the
 * template library and promoting an event to past buyers.
 */

async function queue(admin: APIRequestContext, name: string, eventId: string) {
  const response = await admin.get(`/api/admin/messages?queue=${name}&event=${eventId}`);
  expect(response.status(), await response.text()).toBe(200);
  return (await response.json()).data as { counts: Record<string, number>; candidates: any[] };
}

async function mark(admin: APIRequestContext, q: string, orderIds: string[], channel = 'email') {
  const response = await admin.post('/api/admin/messages/log', { data: { queue: q, channel, order_ids: orderIds } });
  expect(response.status(), await response.text()).toBe(200);
  return (await response.json()).data.recorded as number;
}

test.describe('Customer messages', () => {
  test('templates: defaults are added once, one picked first per stage', async () => {
    const admin = await adminApi();
    const templates = (await (await admin.get('/api/admin/messages/templates')).json()).data as any[];
    for (const stage of ['ticket_confirmation', 'event_reminder', 'post_event', 'post_event_no_show', 'promotion']) {
      expect(templates.filter((t) => t.stage === stage && t.is_default), stage).toHaveLength(1);
    }

    const create = (data: object) => admin.post('/api/admin/messages/templates', { data: { stage: 'general', ...data } });
    const first = (await (await create({ name: 'E2E one', body: 'Hi {first_name}' })).json()).data;
    const second = (await (await create({ name: 'E2E two', subject: 'S', body: 'B', is_default: true })).json()).data;
    expect(second.is_default).toBe(true);
    const generalDefaults = async () =>
      (await sql`SELECT id FROM message_templates WHERE stage = 'general' AND is_default`).map((r) => r.id);
    expect(await generalDefaults()).toEqual([second.id]);

    // Deleting the default picks another one first
    expect((await admin.delete(`/api/admin/messages/templates/${second.id}`)).status()).toBe(200);
    expect((await generalDefaults()).length).toBe(1);
    expect((await admin.put(`/api/admin/messages/templates/${first.id}`, { data: { stage: 'general', name: 'E2E one', subject: '', body: '' } })).status()).toBe(400);
    await sql`DELETE FROM message_templates WHERE name LIKE 'E2E %'`;
  });

  test('confirmation: listed with filled-in details, PDF status, marked once, undo', async () => {
    const admin = await adminApi();
    const event = await createEvent({ startsInDays: 7 });
    const order = await paidOrder(event.id, [{ name: 'Standard', quantity: 2 }], { first_name: 'Cleo' });
    await paidOrder(event.id, [{ name: 'Standard', quantity: 1 }], { status: 'pending' });

    let data = await queue(admin, 'confirmation', event.id);
    expect(data.candidates).toHaveLength(1);
    const c = data.candidates[0];
    expect(c).toMatchObject({ order_id: order.id, has_pdf: false, suggested_stage: 'ticket_confirmation', tickets: '2 × Standard' });
    expect(c.values).toMatchObject({ first_name: 'Cleo', event: event.title, venue: 'E2E Venue, Leeds', reference: order.reference, quantity: '2' });
    expect(c.values.order_link).toMatch(new RegExp(`/tickets/order/${order.id}\\?k=[0-9a-f]{32}$`));
    expect(c.values.tickets_link).toContain(`/events/${event.id}/tickets`);
    expect(c.values.event_date).toMatch(/^[A-Z][a-z]+day \d{1,2} [A-Z][a-z]+$/);

    expect((await admin.post(`/api/admin/tickets/orders/${order.id}/pdf`)).status()).toBe(200);
    expect((await queue(admin, 'confirmation', event.id)).candidates[0].has_pdf).toBe(true);

    expect(await mark(admin, 'confirmation', [order.id])).toBe(1);
    expect(await mark(admin, 'confirmation', [order.id])).toBe(0);
    expect((await queue(admin, 'confirmation', event.id)).candidates).toHaveLength(0);

    const log = (await (await admin.get('/api/admin/messages/log')).json()).data as any[];
    const entry = log.find((l) => l.order_id === order.id);
    expect(entry).toMatchObject({ queue: 'confirmation', channel: 'email', reference: order.reference });
    expect((await admin.delete(`/api/admin/messages/log?id=${entry.id}`)).status()).toBe(200);
    expect((await queue(admin, 'confirmation', event.id)).candidates).toHaveLength(1);
  });

  test('reminder: only events in the next 3 days', async () => {
    const admin = await adminApi();
    const soon = await createEvent({ startsInDays: 2 });
    const later = await createEvent({ startsInDays: 7 });
    const a = await paidOrder(soon.id, [{ name: 'Standard', quantity: 1 }]);
    await paidOrder(later.id, [{ name: 'Standard', quantity: 1 }]);
    expect((await queue(admin, 'reminder', soon.id)).candidates.map((c) => c.order_id)).toEqual([a.id]);
    expect((await queue(admin, 'reminder', later.id)).candidates).toHaveLength(0);
  });

  test('after the event: came or not, last 14 days only', async () => {
    const admin = await adminApi();
    const past = await createEvent({ startsInDays: -2, status: 'completed' });
    const old = await createEvent({ startsInDays: -20, status: 'completed' });
    const came = await paidOrder(past.id, [{ name: 'Standard', quantity: 2 }]);
    const missed = await paidOrder(past.id, [{ name: 'Standard', quantity: 1 }]);
    await paidOrder(old.id, [{ name: 'Standard', quantity: 1 }]);
    await sql`UPDATE ticket_orders SET arrived_at = NOW() WHERE id = ${came.id}`;

    const data = await queue(admin, 'follow_up', past.id);
    const byId = Object.fromEntries(data.candidates.map((c) => [c.order_id, c]));
    expect(byId[came.id]).toMatchObject({ attended: true, suggested_stage: 'post_event' });
    expect(byId[missed.id]).toMatchObject({ attended: false, suggested_stage: 'post_event_no_show' });
    expect((await queue(admin, 'follow_up', old.id)).candidates).toHaveLength(0);
    // A finished event's buyers aren't waiting for a confirmation any more
    expect((await queue(admin, 'confirmation', past.id)).candidates).toHaveLength(0);
  });

  test('promote: past buyers who agreed to marketing and have not bought yet', async () => {
    const admin = await adminApi();
    const before = await createEvent({ startsInDays: -30, status: 'completed' });
    const next = await createEvent({ startsInDays: 10 });
    const yes = await paidOrder(before.id, [{ name: 'Standard', quantity: 1 }]);
    const no = await paidOrder(before.id, [{ name: 'Standard', quantity: 1 }]);
    const already = await paidOrder(before.id, [{ name: 'Standard', quantity: 1 }]);
    await sql`UPDATE ticket_orders SET marketing_consent = true WHERE id IN (${yes.id}, ${already.id})`;
    await paidOrder(next.id, [{ name: 'Standard', quantity: 1 }], { email: already.email });

    const data = (await (await admin.get(`/api/admin/messages/promo?event=${next.id}`)).json()).data;
    expect(data.events.map((e: any) => e.id)).toContain(next.id);
    expect(data.events.find((e: any) => e.id === next.id).values).toMatchObject({ event: next.title, venue: 'E2E Venue, Leeds' });
    expect(data.past_buyer_emails).toContain(yes.email);
    expect(data.past_buyer_emails).not.toContain(no.email);
    expect(data.past_buyer_emails).not.toContain(already.email);
  });

  test('admins only; dashboard shows what is waiting', async () => {
    const manager = await createTeamUser('manager');
    const managerApi = await teamApi(manager.email, manager.password);
    expect((await managerApi.get('/api/admin/messages')).status()).toBe(403);
    expect((await (await anonymousApi()).get('/api/admin/messages/templates')).status()).toBe(401);

    const admin = await adminApi();
    const event = await createEvent({ startsInDays: 5 });
    await paidOrder(event.id, [{ name: 'Standard', quantity: 1 }]);
    const dashboard = (await (await admin.get('/api/admin/dashboard')).json()).data;
    expect(dashboard.attention.map((a: any) => a.key)).toContain('ticket-confirmations');
  });

  test('page: create the PDF, see the message, mark it sent', async ({ page }) => {
    const admin = await adminApi();
    const event = await createEvent({ startsInDays: 6 });
    await paidOrder(event.id, [{ name: 'Standard', quantity: 1 }], { first_name: 'Pagetest', last_name: 'Person' });
    await page.context().addCookies((await admin.storageState()).cookies);
    await page.goto('/admin/messages');
    await expect(page.getByRole('heading', { name: /Customer messages/ })).toBeVisible();

    const row = page.locator('li', { hasText: 'Pagetest Person' });
    await expect(row.getByText('Create the PDF first')).toBeVisible();
    const download = page.waitForEvent('download');
    await row.getByRole('button', { name: 'Create PDF' }).click();
    await download;
    await row.getByText('Message:').click();
    await expect(row.getByText(`Your tickets for ${event.title}`).first()).toBeVisible();
    await row.getByRole('button', { name: 'Sent by email' }).click();
    await expect(page.getByText('1 marked as sent (email).')).toBeVisible();
    await expect(page.locator('li', { hasText: 'Pagetest Person' })).toHaveCount(0);
  });
});
