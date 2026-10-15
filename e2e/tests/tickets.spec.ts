import { test, expect } from '@playwright/test';
import { createEvent, createMember, createTicketType, pointsFor, sql, ticketOrder } from '../support/db';
import { checkoutsForOrder, settle } from '../support/sumup';
import { fakeIp, orderStatus, placeOrder, startOrder } from '../support/tickets';
import { adminApi } from '../support/auth';

test.describe('Buying tickets on the website', () => {
  test('a member buys two tickets, declines once, pays on retry and earns points', async ({ page }) => {
    const member = await createMember();
    const event = await createEvent();
    await createTicketType(event.id, { name: 'General admission', priceCents: 1500, capacity: 50 });
    await page.setExtraHTTPHeaders({ 'x-nf-client-connection-ip': fakeIp() });

    // Event page links to the website's own ticket page
    await page.goto(`/events/${event.id}`);
    await page.getByRole('link', { name: /buy tickets/i }).click();
    await expect(page).toHaveURL(new RegExp(`/events/${event.id}/tickets`));

    await page.getByRole('button', { name: 'One more' }).first().click();
    await page.getByRole('button', { name: 'One more' }).first().click();
    await page.getByLabel('First name').fill('Ada');
    await page.getByLabel('Last name').fill('Member');
    await page.getByLabel('Email', { exact: true }).fill(member.email.toUpperCase()); // matched without caring about case
    await page.getByLabel('I accept the').check();

    // Instagram is always required
    await page.getByRole('button', { name: 'Continue to pay £30' }).click();
    await expect(page.getByRole('alert').filter({ hasText: 'Instagram' })).toBeVisible();

    await page.getByLabel('Instagram').fill('https://www.instagram.com/Ada.Member/');
    await page.getByLabel('Town or city (optional)').fill('Leeds');
    await page.getByLabel('Age (optional)').selectOption('25-34');
    await page.getByLabel('How did you hear about this event? (optional)').selectOption('instagram');
    await page.getByRole('button', { name: 'Continue to pay £30' }).click();

    // Pretend SumUp: decline first
    await expect(page).toHaveURL(/127\.0\.0\.1:4010\/pay\//);
    await page.getByRole('link', { name: 'Decline' }).click();
    await expect(page.getByRole('heading', { name: "Your payment didn't go through" })).toBeVisible();

    await page.getByRole('button', { name: 'Try again' }).click();
    await expect(page).toHaveURL(/127\.0\.0\.1:4010\/pay\//);
    await page.getByRole('link', { name: 'Pay' }).click();

    await expect(page.getByRole('heading', { name: /You're going, Ada!/ })).toBeVisible();
    await expect(page.getByText(/VT-[A-Z0-9]{6}/)).toBeVisible();
    await expect(page.getByText('10 V•PRIVILEGE points added')).toBeVisible();

    const orderId = page.url().match(/order\/([0-9a-f-]{36})/)![1];
    const order = await ticketOrder(orderId);
    expect(order).toMatchObject({
      status: 'paid',
      quantity: 2,
      total_cents: 3000,
      instagram: 'ada.member',
      age_range: '25-34',
      heard_from: 'instagram',
      member_user_id: member.id,
      points_awarded: 10,
      payment_attempts: 2,
    });
    const points = await pointsFor(member.id);
    expect(points.reward).toBe(10);
    expect(points.status).toBe(10);
  });

  test('campaign tags on the link are recorded with the order', async ({ page }) => {
    const event = await createEvent();
    await createTicketType(event.id, { priceCents: 0, name: 'Guest list' });
    await page.setExtraHTTPHeaders({ 'x-nf-client-connection-ip': fakeIp() });

    await page.goto(`/events/${event.id}/tickets?utm_source=instagram&utm_medium=story&utm_campaign=launch`);
    await page.getByRole('button', { name: 'One more' }).click();
    await page.getByLabel('First name').fill('Camp');
    await page.getByLabel('Last name').fill('Aign');
    await page.getByLabel('Email', { exact: true }).fill('campaign@example.com');
    await page.getByLabel('Instagram').fill('@camp.aign');
    await page.getByLabel('I accept the').check();
    await page.getByRole('button', { name: 'Get 1 free ticket' }).click();

    // Free tickets skip payment
    await expect(page.getByRole('heading', { name: /You're going, Camp!/ })).toBeVisible();
    const orderId = page.url().match(/order\/([0-9a-f-]{36})/)![1];
    expect(await ticketOrder(orderId)).toMatchObject({ status: 'paid', total_cents: 0, utm_source: 'instagram', utm_medium: 'story', utm_campaign: 'launch' });
  });

  test('a Gold member earns points at their tier rate', async ({ request }) => {
    const member = await createMember({ tier: 'gold' });
    const event = await createEvent();
    const type = await createTicketType(event.id, { priceCents: 1500 });
    const order = await startOrder(request, event.id, [{ ticket_type_id: type.id, quantity: 2 }], { email: member.email });

    const [checkout] = await checkoutsForOrder(order.id);
    await settle(checkout.id, 'paid');
    const { body } = await orderStatus(request, order.id, order.token);
    expect(body.data.status).toBe('paid');
    const [rule] = await sql`SELECT points_per_unit FROM vip_point_rules WHERE action_type = 'ticket_purchase' AND is_active`;
    const [mult] = await sql`SELECT points_per_unit FROM vip_point_rules WHERE action_type = 'tier_multiplier_gold'`;
    const base = Math.floor(Math.round(30 * Number(rule.points_per_unit) * 1000) / 1000);
    expect(body.data.points_awarded).toBe(Math.floor(base * Number(mult?.points_per_unit ?? 1.5)));
  });

  test('a non-member gets no points', async ({ request }) => {
    const event = await createEvent();
    const type = await createTicketType(event.id, { priceCents: 1000 });
    const order = await startOrder(request, event.id, [{ ticket_type_id: type.id, quantity: 1 }], { email: 'not-a-member@example.com' });
    const [checkout] = await checkoutsForOrder(order.id);
    await settle(checkout.id, 'paid');
    const { body } = await orderStatus(request, order.id, order.token);
    expect(body.data).toMatchObject({ status: 'paid', points_awarded: 0 });
  });
});

test.describe('Ticket limits', () => {
  test('capacity, holds and the most per order are enforced', async ({ request }) => {
    const event = await createEvent();
    const type = await createTicketType(event.id, { capacity: 3, maxPerOrder: 2 });
    const item = (quantity: number) => [{ ticket_type_id: type.id, quantity }];

    const tooMany = await placeOrder(request, event.id, item(3), { email: 'a@example.com' });
    expect((await tooMany.json()).error).toBe('You can buy up to 2 "General admission" tickets per order');

    // Two unpaid orders hold all three tickets
    await startOrder(request, event.id, item(2), { email: 'b@example.com' });
    const second = await placeOrder(request, event.id, item(2), { email: 'c@example.com' });
    expect((await second.json()).error).toBe('Only 1 "General admission" ticket left');
    await startOrder(request, event.id, item(1), { email: 'd@example.com' });

    const soldOut = await placeOrder(request, event.id, item(1), { email: 'e@example.com' });
    expect((await soldOut.json()).error).toBe('"General admission" is sold out');

    const listing = await (await request.get(`/api/events/${event.id}/tickets`)).json();
    expect(listing.data.ticket_types[0]).toMatchObject({ remaining: 0, on_sale: false, note: 'Sold out' });
  });

  test('two buyers racing for the last ticket: only one gets it', async ({ request }) => {
    const event = await createEvent();
    const type = await createTicketType(event.id, { capacity: 1 });
    const results = await Promise.all(
      [1, 2, 3, 4].map((n) => placeOrder(request, event.id, [{ ticket_type_id: type.id, quantity: 1 }], { email: `race${n}@example.com` }))
    );
    const ok = results.filter((r) => r.ok());
    expect(ok).toHaveLength(1);
  });

  test('tickets not on sale yet, and events that are over, can’t be bought', async ({ request }) => {
    const future = await createEvent();
    const later = await createTicketType(future.id, { salesStartInDays: 3 });
    const early = await placeOrder(request, future.id, [{ ticket_type_id: later.id, quantity: 1 }], { email: 'early@example.com' });
    expect((await early.json()).error).toBe('One of these tickets is no longer on sale');

    const past = await createEvent({ startsInDays: -2 });
    const old = await createTicketType(past.id);
    const late = await placeOrder(request, past.id, [{ ticket_type_id: old.id, quantity: 1 }], { email: 'late@example.com' });
    expect(late.status()).toBe(400);
  });

  test('the form refuses bad details and spam', async ({ request }) => {
    const event = await createEvent();
    const type = await createTicketType(event.id);
    const items = [{ ticket_type_id: type.id, quantity: 1 }];
    const error = async (buyer: Record<string, unknown>) => (await (await placeOrder(request, event.id, items, buyer as any)).json()).error;

    expect(await error({ email: 'x@example.com', instagram: '' })).toBe('Enter your Instagram username');
    expect(await error({ email: 'x@example.com', instagram: 'not a handle!' })).toBe('Enter your Instagram username, e.g. @yourname');
    expect(await error({ email: 'not-an-email' })).toBe('Enter a valid email');
    expect(await error({ email: 'x@example.com', accept_terms: false })).toBe('Please accept the ticket terms to continue');
    expect(await error({ email: 'x@example.com', 'bot-field': 'spam' })).toBe('Please check your details');
  });
});

test.describe('Payments', () => {
  test('SumUp’s callback confirms a payment once, however often it’s sent', async ({ request }) => {
    const member = await createMember();
    const event = await createEvent();
    const type = await createTicketType(event.id, { priceCents: 3000 });
    const order = await startOrder(request, event.id, [{ ticket_type_id: type.id, quantity: 1 }], { email: member.email });
    const [checkout] = await checkoutsForOrder(order.id);
    await settle(checkout.id, 'paid');

    for (let i = 0; i < 3; i++) {
      const callback = await request.post('/api/webhooks/sumup-online', { data: { event_type: 'CHECKOUT_STATUS_CHANGED', id: checkout.id } });
      expect(callback.status()).toBe(204);
    }
    expect((await ticketOrder(order.id)).status).toBe('paid');
    const points = await pointsFor(member.id);
    expect(points.log.filter((e: any) => e.source === 'ticket_purchase')).toHaveLength(2); // one per ledger
    expect(points.reward).toBe(10);
  });

  test('the order page needs the private link', async ({ request }) => {
    const event = await createEvent();
    const type = await createTicketType(event.id);
    const order = await startOrder(request, event.id, [{ ticket_type_id: type.id, quantity: 1 }], { email: 'private@example.com' });
    expect((await orderStatus(request, order.id, 'x'.repeat(32))).status).toBe(404);
    expect((await orderStatus(request, order.id, order.token)).status).toBe(200);
  });
});

test.describe('Admin: refunds, door list and export', () => {
  test('a refund takes back points and frees the tickets', async ({ request }) => {
    const member = await createMember();
    const event = await createEvent();
    const type = await createTicketType(event.id, { priceCents: 1500, capacity: 2 });
    const order = await startOrder(request, event.id, [{ ticket_type_id: type.id, quantity: 2 }], { email: member.email });
    await settle((await checkoutsForOrder(order.id))[0].id, 'paid');
    await orderStatus(request, order.id, order.token);
    expect((await pointsFor(member.id)).reward).toBe(10);

    const admin = await adminApi();
    const refund = await admin.patch(`/api/admin/tickets/orders/${order.id}`, { data: { action: 'refund', reason: 'E2E' } });
    expect((await refund.json()).data.points_reversed).toBe(10);
    const again = await admin.patch(`/api/admin/tickets/orders/${order.id}`, { data: { action: 'refund' } });
    expect((await again.json()).error).toBe('This order has already been refunded');

    expect((await pointsFor(member.id)).reward).toBe(0);
    const listing = await (await request.get(`/api/events/${event.id}/tickets`)).json();
    expect(listing.data.ticket_types[0].remaining).toBe(2);
  });

  test('door list tick-off, analysis and a spreadsheet-safe CSV', async ({ page, request }) => {
    const event = await createEvent();
    const type = await createTicketType(event.id, { priceCents: 0, name: 'Guest list' });
    await startOrder(request, event.id, [{ ticket_type_id: type.id, quantity: 2 }], {
      email: 'door@example.com',
      first_name: '=HYPERLINK("x")',
      last_name: 'Zed',
      instagram: '@door.person',
      city: 'Leeds',
      heard_from: 'friend',
    });

    const admin = await adminApi();
    const csv = await (await admin.get(`/api/admin/tickets/orders?event=${event.id}&format=csv`)).text();
    const [header, row] = csv.replace(/^﻿/, '').split('\r\n');
    expect(header).toContain('Instagram,Instagram link');
    expect(row).toContain(`'=HYPERLINK`); // formulas are neutralised
    expect(row).toContain('door.person,https://www.instagram.com/door.person/');

    const summary = (await (await admin.get(`/api/admin/tickets/orders?event=${event.id}`)).json()).data.summary;
    expect(summary).toMatchObject({ orders: 1, tickets: 2 });
    expect(summary.by_heard_from).toEqual([{ key: 'friend', orders: 1 }]);

    await page.context().addCookies((await admin.storageState()).cookies);
    await page.goto('/admin/tickets');
    await page.getByLabel('Event').selectOption(event.id);
    await page.getByRole('button', { name: 'Door list' }).click();
    await expect(page.getByText('2 tickets on 1 order · 0 arrived')).toBeVisible();
    await page.getByRole('checkbox', { name: /Zed arrived/ }).click(); // saved, then the list reloads
    await expect(page.getByText('2 tickets on 1 order · 2 arrived')).toBeVisible();
  });

  test('ticket admin is for admins only', async ({ request }) => {
    expect((await request.get('/api/admin/tickets/orders')).status()).toBe(401);
    expect((await request.post('/api/admin/tickets/types', { data: {} })).status()).toBe(401);
  });
});
