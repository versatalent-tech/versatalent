import { test, expect, type APIRequestContext } from '@playwright/test';
import { randomBytes } from 'node:crypto';
import { createEvent, createMember, createTicketType, pointsFor, sql, ticketOrder } from '../support/db';
import { checkoutsForOrder, settle } from '../support/sumup';
import { fakeIp, orderStatus, startOrder } from '../support/tickets';
import { pretendPhone } from '../support/phone';

/**
 * A buyer who's a V•PRIVILEGE member can add their membership while buying
 * (membership email, or tapping their card on an Android phone) or after
 * buying (on the order page), so the order earns their points.
 */
async function paid(request: APIRequestContext, order: { id: string; token: string }) {
  const [checkout] = await checkoutsForOrder(order.id);
  await settle(checkout.id, 'paid');
  return (await orderStatus(request, order.id, order.token)).body.data;
}

/** A member's card, with its id as stored and as Chrome reports it */
async function memberCard(opts: { active?: boolean } = {}) {
  const member = await createMember({ tier: 'gold' });
  const bytes = randomBytes(7);
  bytes[0] = 0x04;
  const uid = bytes.toString('hex').toUpperCase();
  await sql`INSERT INTO nfc_cards (card_uid, user_id, type, is_active) VALUES (${uid}, ${member.id}, 'vip', ${opts.active ?? true})`;
  return { member, uid, serial: bytes.toString('hex').match(/../g)!.join(':') };
}

test.describe('Membership email on the form', () => {
  test('a membership email puts the points on that member', async ({ request }) => {
    const member = await createMember();
    const event = await createEvent();
    const type = await createTicketType(event.id, { priceCents: 1500 });
    const order = await startOrder(request, event.id, [{ ticket_type_id: type.id, quantity: 2 }], {
      email: 'buying-with-another@example.com',
      member_email: member.email.toUpperCase(),
    });
    expect((await ticketOrder(order.id)).member_user_id).toBe(member.id);
    const data = await paid(request, order);
    expect(data.points_awarded).toBeGreaterThan(0);
    expect((await pointsFor(member.id)).log.some((l: any) => l.source === 'ticket_purchase')).toBe(true);
  });

  test('an unknown membership email: no error, no points', async ({ request }) => {
    const event = await createEvent();
    const type = await createTicketType(event.id, { priceCents: 1000 });
    const order = await startOrder(request, event.id, [{ ticket_type_id: type.id, quantity: 1 }], {
      email: 'buyer-x@example.com',
      member_email: 'not-a-member@example.com',
    });
    expect((await ticketOrder(order.id)).member_user_id).toBeNull();
    expect(await paid(request, order)).toMatchObject({ points_awarded: 0, member: null });
  });

  test('the form has the membership email box', async ({ page }) => {
    const event = await createEvent();
    await createTicketType(event.id, { priceCents: 1000 });
    await page.goto(`/events/${event.id}/tickets`);
    await expect(page.getByLabel('Your membership email')).toBeVisible();
  });
});

test.describe('Tapping a card on the form', () => {
  test('the card lookup gives the member’s first name and tier, for active member cards only', async ({ request }) => {
    const { member, uid } = await memberCard();
    const ok = await request.post('/api/tickets/card', { data: { card_uid: uid }, headers: { 'x-nf-client-connection-ip': fakeIp() } });
    expect(ok.status()).toBe(200);
    expect((await ok.json()).data).toEqual({ id: member.id, first_name: 'E2E', tier: 'gold' });

    const inactive = await memberCard({ active: false });
    for (const card of [inactive.uid, '04AABBCCDDEEFF']) {
      const response = await request.post('/api/tickets/card', { data: { card_uid: card }, headers: { 'x-nf-client-connection-ip': fakeIp() } });
      expect(response.status()).toBe(404);
      expect((await response.json()).error).toBe('This card isn’t a membership card');
    }
  });

  test('tapping a card on an Android phone links it to the order', async ({ page }) => {
    const { serial } = await memberCard();
    const event = await createEvent();
    await createTicketType(event.id, { priceCents: 1000 });
    await pretendPhone(page);
    await page.goto(`/events/${event.id}/tickets`);
    await page.getByRole('button', { name: 'Tap cards on this device' }).click();
    await expect(page.getByText('Phone tap is on')).toBeVisible();
    await page.evaluate((s) => (window as any).__tap(s), serial);
    await expect(page.getByText('Points go to')).toContainText('E2E');
    await expect(page.getByText('Points go to')).toContainText('Gold member');
  });
});

test.describe('Adding the membership after buying', () => {
  async function paidOrderWithoutMember(request: APIRequestContext) {
    const event = await createEvent();
    const type = await createTicketType(event.id, { priceCents: 1500 });
    const order = await startOrder(request, event.id, [{ ticket_type_id: type.id, quantity: 1 }], { email: `forgot-${randomBytes(4).toString('hex')}@example.com` });
    await paid(request, order);
    return order;
  }
  const claim = (request: APIRequestContext, orderId: string, k: string, email: string) =>
    request.post(`/api/tickets/orders/${orderId}/member`, { data: { k, email } });

  test('the points arrive once', async ({ request }) => {
    const member = await createMember();
    const other = await createMember();
    const order = await paidOrderWithoutMember(request);
    const first = await claim(request, order.id, order.token, member.email);
    expect(first.status()).toBe(200);
    expect((await first.json()).message).toBe('If that’s a membership email, the points are on it now.');
    const after = await ticketOrder(order.id);
    expect(after.member_user_id).toBe(member.id);
    expect(Number(after.points_awarded)).toBeGreaterThan(0);

    // A second try (even with another membership) changes nothing
    expect((await claim(request, order.id, order.token, other.email)).status()).toBe(200);
    expect((await ticketOrder(order.id)).member_user_id).toBe(member.id);
    expect((await pointsFor(other.id)).log).toHaveLength(0);
    // One award (it's written to both the status and reward ledgers)
    expect((await pointsFor(member.id)).log.filter((l: any) => l.source === 'ticket_purchase' && l.ledger === 'status')).toHaveLength(1);
  });

  test('an unknown email gives the same answer and changes nothing', async ({ request }) => {
    const order = await paidOrderWithoutMember(request);
    const response = await claim(request, order.id, order.token, 'nobody-here@example.com');
    expect(response.status()).toBe(200);
    expect((await response.json()).message).toBe('If that’s a membership email, the points are on it now.');
    expect((await ticketOrder(order.id)).member_user_id).toBeNull();
  });

  test('a wrong order link or an unpaid order is refused', async ({ request }) => {
    const member = await createMember();
    const order = await paidOrderWithoutMember(request);
    expect((await claim(request, order.id, 'wrong-token', member.email)).status()).toBe(404);

    const event = await createEvent();
    const type = await createTicketType(event.id, { priceCents: 1000 });
    const unpaid = await startOrder(request, event.id, [{ ticket_type_id: type.id, quantity: 1 }], { email: 'unpaid-buyer@example.com' });
    expect((await claim(request, unpaid.id, unpaid.token, member.email)).status()).toBe(409);
  });

  test('the order page offers it when no membership is linked', async ({ page, request }) => {
    const member = await createMember();
    const order = await paidOrderWithoutMember(request);
    await page.goto(order.orderUrl);
    await expect(page.getByText('Forgot to add your membership?')).toBeVisible();
    await page.getByLabel('Your membership email').fill(member.email);
    await page.getByRole('button', { name: 'Add my membership' }).click();
    await expect(page.getByText(/V•PRIVILEGE points added/)).toBeVisible();
  });
});
