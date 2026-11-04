import { test, expect } from '@playwright/test';
import { createEvent, createMember, createTeamUser, createTicketType, pointsFor, sql, ticketOrder } from '../support/db';
import { checkoutsForOrder, settle } from '../support/sumup';
import { orderStatus, startOrder } from '../support/tickets';
import { adminApi } from '../support/auth';

test.describe('Buying tickets with a membership card', () => {
  test('points go to the card’s member, whichever email the buyer uses', async ({ request }) => {
    const member = await createMember();
    const event = await createEvent();
    const type = await createTicketType(event.id, { priceCents: 1500 });
    const order = await startOrder(request, event.id, [{ ticket_type_id: type.id, quantity: 2 }], {
      email: 'someone-else@example.com',
      member: member.id,
      source: 'member_pass',
    });
    expect((await ticketOrder(order.id)).member_user_id).toBe(member.id);

    const [checkout] = await checkoutsForOrder(order.id);
    await settle(checkout.id, 'paid');
    const { body } = await orderStatus(request, order.id, order.token);
    expect(body.data.status).toBe('paid');
    expect(body.data.points_awarded).toBeGreaterThan(0);
    expect(body.data.member).toEqual({ first_name: 'E2E', tier: 'silver' });
    const points = await pointsFor(member.id);
    expect(points.log.filter((l: any) => l.source === 'ticket_purchase').length).toBeGreaterThan(0);
  });

  test('a link to someone who isn’t a member earns nobody points', async ({ request }) => {
    const staff = await createTeamUser('manager');
    const event = await createEvent();
    const type = await createTicketType(event.id, { priceCents: 1000 });
    for (const member of [staff.id, '00000000-0000-4000-8000-000000000000']) {
      const order = await startOrder(request, event.id, [{ ticket_type_id: type.id, quantity: 1 }], { email: 'nobody@example.com', member });
      expect((await ticketOrder(order.id)).member_user_id).toBeNull();
      const [checkout] = await checkoutsForOrder(order.id);
      await settle(checkout.id, 'paid');
      const { body } = await orderStatus(request, order.id, order.token);
      expect(body.data).toMatchObject({ status: 'paid', points_awarded: 0, member: null });
    }
  });

  test('the ticket page names the card’s member, and “Not you?” unlinks it', async ({ page }) => {
    const member = await createMember({ tier: 'gold' });
    const event = await createEvent();
    await createTicketType(event.id, { priceCents: 1000 });
    await page.goto(`/events/${event.id}/tickets?from=pass&member=${member.id}`);
    await expect(page.getByText('Points go to')).toContainText('E2E');
    await expect(page.getByText('Points go to')).toContainText('Gold member');
    await page.getByRole('button', { name: 'Not you?' }).click();
    await expect(page.getByText('Points go to')).toHaveCount(0);
    expect(new URL(page.url()).searchParams.get('member')).toBeNull();
  });

  test('the member pass lists events on sale with links that carry the card', async ({ page }) => {
    const member = await createMember();
    const event = await createEvent({ startsInDays: 1 });
    await createTicketType(event.id, { priceCents: 1000 });
    await page.goto(`/vip/${member.id}`);
    const link = page.getByRole('link', { name: new RegExp(event.title) });
    await expect(link).toHaveAttribute('href', `/events/${event.id}/tickets?from=pass&member=${member.id}`);
  });
});

test.describe('The public member pass', () => {
  test('anyone with the link sees the pass, but not the history or full name', async ({ request }) => {
    const member = await createMember();
    await sql`UPDATE users SET name = 'Private Surname' WHERE id = ${member.id}`;

    expect((await request.get(`/api/vip/points-log?user_id=${member.id}`)).status()).toBe(403);
    expect((await request.get(`/api/nfc/checkins?user_id=${member.id}`)).status()).toBe(403);
    expect((await request.get(`/api/vip/memberships/${member.id}`)).status()).toBe(200);
    const user = await (await request.get(`/api/nfc/users/${member.id}`)).json();
    expect(user.name).toBe('Private');
    expect(user.email).toBeUndefined();

    const admin = await adminApi();
    expect((await admin.get(`/api/vip/points-log?user_id=${member.id}`)).status()).toBe(200);
    expect((await admin.get(`/api/nfc/checkins?user_id=${member.id}`)).status()).toBe(200);
    expect((await (await admin.get(`/api/nfc/users/${member.id}`)).json()).name).toBe('Private Surname');
  });

  test('the pass page hides the history tabs from the public', async ({ page }) => {
    const member = await createMember();
    await page.goto(`/vip/${member.id}`);
    await expect(page.getByRole('tab', { name: 'Benefits' })).toBeVisible();
    await expect(page.getByText('Your points history and check-ins are kept private')).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Points History' })).toHaveCount(0);
  });
});
