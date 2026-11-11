import { test, expect, type APIRequestContext } from '@playwright/test';
import { PDFDocument } from 'pdf-lib';
import { randomBytes } from 'node:crypto';
import { createEvent, createMember, createTeamUser, createTicketType, pointsFor, sql } from '../support/db';
import { adminApi, anonymousApi, teamApi } from '../support/auth';
import { paidOrder } from '../support/tickets';
import { ADMIN_STATE } from '../support/env';

/**
 * Ticket types for these events go on sale in a month, so the many test
 * events here don't crowd the member pass's "on sale now" list in other tests
 */
const NOT_ON_SALE = { salesStartInDays: 30 };

/**
 * Ticket PDFs with one QR code per person, and letting people in at the door
 * by QR, by VIP card or by finding the ticket.
 */
async function ticketsOf(orderId: string) {
  return sql`SELECT number, ticket_type_name, code, admitted_at, admitted_via FROM tickets WHERE order_id = ${orderId} ORDER BY number`;
}

test.describe('Ticket PDFs', () => {
  test('Create PDF makes one ticket per person, numbered by item', async () => {
    const event = await createEvent({ startsInDays: 7 });
    const order = await paidOrder(event.id, [{ name: 'Standard', quantity: 2 }, { name: 'VIP', quantity: 1 }]);
    const admin = await adminApi();
    const response = await admin.post(`/api/admin/tickets/orders/${order.id}/pdf`);
    expect(response.status(), await response.text()).toBe(200);
    expect(response.headers()['content-type']).toContain('application/pdf');

    const tickets = await ticketsOf(order.id);
    expect(tickets.map((t) => [t.number, t.ticket_type_name])).toEqual([[1, 'Standard'], [2, 'Standard'], [3, 'VIP']]);
    for (const t of tickets) expect(t.code).toMatch(/^VT-[A-Z2-7]{26}$/);
    expect(new Set(tickets.map((t) => t.code)).size).toBe(3);

    const pdf = await PDFDocument.load(await response.body());
    expect(pdf.getPageCount()).toBe(3);
    expect(pdf.getTitle()).toContain(order.reference);
    const [stored] = await sql`SELECT pdf_key, pdf_created_at FROM ticket_orders WHERE id = ${order.id}`;
    expect(stored.pdf_key).toBe(`tickets/${order.id}.pdf`);
    expect(stored.pdf_created_at).not.toBeNull();
  });

  test('Remake keeps the codes; Download returns the stored PDF', async () => {
    const event = await createEvent({ startsInDays: 7 });
    const order = await paidOrder(event.id, [{ name: 'Standard', quantity: 3 }]);
    const admin = await adminApi();
    expect((await admin.post(`/api/admin/tickets/orders/${order.id}/pdf`)).status()).toBe(200);
    const first = (await ticketsOf(order.id)).map((t) => t.code);
    expect((await admin.post(`/api/admin/tickets/orders/${order.id}/pdf`)).status()).toBe(200);
    expect((await ticketsOf(order.id)).map((t) => t.code)).toEqual(first);

    const download = await admin.get(`/api/admin/tickets/orders/${order.id}/pdf`);
    expect(download.status()).toBe(200);
    expect(download.headers()['content-disposition']).toContain(`${order.reference}.pdf`);
    expect((await PDFDocument.load(await download.body())).getPageCount()).toBe(3);
  });

  test('no PDF for an unpaid or refunded order', async () => {
    const event = await createEvent({ startsInDays: 7 });
    const admin = await adminApi();
    const pending = await paidOrder(event.id, [{ name: 'Standard', quantity: 1 }], { status: 'pending' });
    expect((await admin.post(`/api/admin/tickets/orders/${pending.id}/pdf`)).status()).toBe(409);
    const refunded = await paidOrder(event.id, [{ name: 'Standard', quantity: 1 }], { status: 'refunded' });
    expect((await admin.post(`/api/admin/tickets/orders/${refunded.id}/pdf`)).status()).toBe(409);
  });

  test('only admins can make or download PDFs', async () => {
    const event = await createEvent({ startsInDays: 7 });
    const order = await paidOrder(event.id, [{ name: 'Standard', quantity: 1 }]);
    const manager = await createTeamUser('manager');
    const managerApi = await teamApi(manager.email, manager.password);
    expect((await managerApi.post(`/api/admin/tickets/orders/${order.id}/pdf`)).status()).toBe(403);
    const anonymous = await anonymousApi();
    expect((await anonymous.get(`/api/admin/tickets/orders/${order.id}/pdf`)).status()).toBe(401);
  });
});

/** An event on today with check-ins switched on (the event day page works for it) */
async function doorEvent() {
  const event = await createEvent({ startsInDays: 0 });
  await sql`INSERT INTO nfc_events (name, date, is_active, event_id) VALUES (${event.title}, NOW(), true, ${event.id})`;
  return event;
}

/** The order's ticket codes (made by creating its PDF) */
async function codesFor(admin: APIRequestContext, orderId: string): Promise<string[]> {
  expect((await admin.post(`/api/admin/tickets/orders/${orderId}/pdf`)).status()).toBe(200);
  return (await ticketsOf(orderId)).map((t) => t.code as string);
}

const admit = async (api: APIRequestContext, eventId: string, code: string) => {
  const response = await api.post(`/api/staff/event-day/${eventId}/tickets/admit`, { data: { code } });
  expect(response.status(), await response.text()).toBe(200);
  return (await response.json()).data;
};

test.describe('At the door', () => {
  test('a valid code is admitted once', async () => {
    const event = await doorEvent();
    const admin = await adminApi();
    const order = await paidOrder(event.id, [{ name: 'Standard', quantity: 2 }]);
    const [code] = await codesFor(admin, order.id);

    const first = await admit(admin, event.id, code);
    expect(first).toMatchObject({ status: 'admitted', order: { in_count: 1, quantity: 2 }, ticket: { admitted_via: 'qr', number: 1 } });
    const [o] = await sql`SELECT arrived_at FROM ticket_orders WHERE id = ${order.id}`;
    expect(o.arrived_at).not.toBeNull();

    const again = await admit(admin, event.id, code.toLowerCase());
    expect(again.status).toBe('already_used');
    expect(again.ticket.admitted_at).toBeTruthy();
  });

  test('two devices scanning together: one admitted, one already used', async () => {
    const event = await doorEvent();
    const admin = await adminApi();
    const order = await paidOrder(event.id, [{ name: 'Standard', quantity: 1 }]);
    const [code] = await codesFor(admin, order.id);
    const results = await Promise.all([admit(admin, event.id, code), admit(admin, event.id, code)]);
    expect(results.map((r) => r.status).sort()).toEqual(['admitted', 'already_used']);
  });

  test('another event’s ticket, a refunded order and garbage are refused', async () => {
    const event = await doorEvent();
    const other = await createEvent({ startsInDays: 3 });
    const admin = await adminApi();
    const elsewhere = await paidOrder(other.id, [{ name: 'Standard', quantity: 1 }]);
    const [otherCode] = await codesFor(admin, elsewhere.id);
    expect(await admit(admin, event.id, otherCode)).toMatchObject({ status: 'other_event', event_title: other.title });

    const refunded = await paidOrder(event.id, [{ name: 'Standard', quantity: 1 }]);
    const [refundedCode] = await codesFor(admin, refunded.id);
    await sql`UPDATE ticket_orders SET status = 'refunded' WHERE id = ${refunded.id}`;
    expect((await admit(admin, event.id, refundedCode)).status).toBe('refunded');

    expect((await admit(admin, event.id, 'hello')).status).toBe('unknown');
    expect((await admit(admin, event.id, 'VT-AAAAAAAAAAAAAAAAAAAAAAAAAA')).status).toBe('unknown');
  });

  test('search finds orders by email, last name and reference; % is literal', async () => {
    const event = await doorEvent();
    const admin = await adminApi();
    const order = await paidOrder(event.id, [{ name: 'Standard', quantity: 2 }]);
    for (const q of [order.email, order.last_name, order.reference]) {
      const response = await admin.get(`/api/staff/event-day/${event.id}/tickets?q=${encodeURIComponent(q)}`);
      expect(response.status()).toBe(200);
      const found = (await response.json()).data.find((r: { id: string }) => r.id === order.id);
      expect(found?.tickets).toHaveLength(2);
    }
    const wild = await admin.get(`/api/staff/event-day/${event.id}/tickets?q=${encodeURIComponent('%%')}`);
    expect((await wild.json()).data).toEqual([]);
  });

  test('admit by hand and undo', async () => {
    const event = await doorEvent();
    const admin = await adminApi();
    const order = await paidOrder(event.id, [{ name: 'Standard', quantity: 2 }]);
    const search = await admin.get(`/api/staff/event-day/${event.id}/tickets?q=${encodeURIComponent(order.reference)}`);
    const ticket = (await search.json()).data[0].tickets[1];
    const admitted = await admin.post(`/api/staff/event-day/${event.id}/tickets/${ticket.id}/admit`);
    expect((await admitted.json()).data).toMatchObject({ status: 'admitted', ticket: { admitted_via: 'manual', number: 2 } });
    expect((await admin.post(`/api/staff/event-day/${event.id}/tickets/${ticket.id}/undo`)).status()).toBe(200);
    const [t] = await sql`SELECT admitted_at FROM tickets WHERE id = ${ticket.id}`;
    expect(t.admitted_at).toBeNull();
    const [o] = await sql`SELECT arrived_at FROM ticket_orders WHERE id = ${order.id}`;
    expect(o.arrived_at).toBeNull();
  });

  test('the admin door list tick admits everyone left; unticking undoes', async () => {
    const event = await doorEvent();
    const admin = await adminApi();
    const order = await paidOrder(event.id, [{ name: 'Standard', quantity: 3 }]);
    expect((await admin.patch(`/api/admin/tickets/orders/${order.id}`, { data: { action: 'arrived', arrived: true } })).status()).toBe(200);
    expect((await ticketsOf(order.id)).map((t) => t.admitted_via)).toEqual(['manual', 'manual', 'manual']);
    expect((await admin.patch(`/api/admin/tickets/orders/${order.id}`, { data: { action: 'arrived', arrived: false } })).status()).toBe(200);
    expect((await ticketsOf(order.id)).every((t) => t.admitted_at === null)).toBe(true);
  });

  test('door actions need a signed-in staff member', async () => {
    const event = await doorEvent();
    const anonymous = await anonymousApi();
    expect((await anonymous.post(`/api/staff/event-day/${event.id}/tickets/admit`, { data: { code: 'VT-AAAAAAAAAAAAAAAAAAAAAAAAAA' } })).status()).toBe(401);
    expect((await anonymous.get(`/api/staff/event-day/${event.id}/tickets?q=ab`)).status()).toBe(401);
  });
});

test.describe('VIP cards', () => {
  /** A ticketed door event (it has a ticket type) */
  async function ticketedDoorEvent() {
    const event = await doorEvent();
    await createTicketType(event.id, NOT_ON_SALE);
    return event;
  }
  async function memberWithCard() {
    const member = await createMember();
    const uid = `04${randomBytes(6).toString('hex')}`.toUpperCase();
    await sql`INSERT INTO nfc_cards (card_uid, user_id, type) VALUES (${uid}, ${member.id}, 'vip')`;
    return { ...member, uid };
  }
  const tap = (api: APIRequestContext, eventId: string, uid: string) =>
    api.post(`/api/staff/event-day/${eventId}/checkin`, { data: { card_uid: uid } });

  test('a member with a ticket is admitted by card and gets points', async () => {
    const event = await ticketedDoorEvent();
    const member = await memberWithCard();
    const order = await paidOrder(event.id, [{ name: 'Standard', quantity: 1 }], { member_user_id: member.id });
    const admin = await adminApi();
    const response = await tap(admin, event.id, member.uid);
    expect(response.status(), await response.text()).toBe(201);
    const body = await response.json();
    expect(body.ticket).toMatchObject({ status: 'admitted', ticket: { admitted_via: 'card' } });
    expect((await ticketsOf(order.id))[0].admitted_via).toBe('card');
    await expect.poll(async () => (await pointsFor(member.id)).status).toBeGreaterThan(0);
  });

  test('tapping again does not use up another ticket', async () => {
    const event = await ticketedDoorEvent();
    const member = await memberWithCard();
    const order = await paidOrder(event.id, [{ name: 'Standard', quantity: 2 }], { member_user_id: member.id });
    const admin = await adminApi();
    expect((await tap(admin, event.id, member.uid)).status()).toBe(201);
    const again = await tap(admin, event.id, member.uid);
    expect((await again.json()).status).toBe('already_checked_in');
    expect((await ticketsOf(order.id)).filter((t) => t.admitted_at !== null)).toHaveLength(1);
  });

  test('a ticket bought with the member’s email in a different case is found', async () => {
    const event = await ticketedDoorEvent();
    const member = await memberWithCard();
    await paidOrder(event.id, [{ name: 'Standard', quantity: 1 }], { email: member.email.toUpperCase() });
    const admin = await adminApi();
    const response = await tap(admin, event.id, member.uid);
    expect(response.status(), await response.text()).toBe(201);
    expect((await response.json()).ticket.status).toBe('admitted');
  });

  test('no ticket, no check-in', async () => {
    const event = await ticketedDoorEvent();
    const member = await memberWithCard();
    const admin = await adminApi();
    const response = await tap(admin, event.id, member.uid);
    expect(response.status()).toBe(404);
    const body = await response.json();
    expect(body).toMatchObject({ code: 'NO_TICKET', error: 'No ticket for this event' });
    expect(body.customer?.name).toBe('E2E Member');
    expect(await sql`SELECT id FROM checkins WHERE user_id = ${member.id}`).toHaveLength(0);
    expect((await pointsFor(member.id)).status).toBe(0);
  });

  test('events without tickets on the website are unchanged', async () => {
    const event = await doorEvent();
    const member = await memberWithCard();
    const admin = await adminApi();
    const response = await tap(admin, event.id, member.uid);
    expect(response.status(), await response.text()).toBe(201);
    expect((await response.json()).status).toBe('checked_in');
  });
});

test.describe('Screens', () => {
  test.use({ storageState: ADMIN_STATE });

  test('admin creates and downloads a ticket PDF', async ({ page }) => {
    const event = await createEvent({ startsInDays: 7 });
    await createTicketType(event.id, NOT_ON_SALE);
    const order = await paidOrder(event.id, [{ name: 'Standard', quantity: 2 }]);
    await page.goto('/admin/tickets');
    await page.getByLabel('Event').selectOption(event.id);
    const row = page.locator('li', { hasText: order.reference });
    const downloading = page.waitForEvent('download');
    await row.getByRole('button', { name: 'Create PDF' }).click();
    expect((await downloading).suggestedFilename()).toMatch(new RegExp(`${order.reference}\\.pdf$`));
    await expect(row.getByRole('button', { name: 'Download PDF' })).toBeVisible();
    await expect(row.getByRole('button', { name: 'Remake PDF' })).toBeVisible();
  });

  test('door: find a ticket and admit it', async ({ page }) => {
    const event = await doorEvent();
    await createTicketType(event.id, NOT_ON_SALE);
    const order = await paidOrder(event.id, [{ name: 'Standard', quantity: 2 }]);
    await page.goto(`/staff/event-day/${event.id}`);
    await page.getByRole('button', { name: 'Find a ticket' }).click();
    await page.getByPlaceholder('Name, email or order reference').fill(order.last_name);
    const found = page.locator('li', { hasText: order.reference });
    await found.getByRole('button', { name: 'Admit ticket 1' }).click();
    await expect(page.getByText(/^Admitted: /)).toBeVisible();
    await expect(found.getByText(/In at/)).toBeVisible();
    await expect(page.getByText('1 / 2')).toBeVisible();
  });

  test('door: the scanner explains how to allow the camera', async ({ page }) => {
    const event = await doorEvent();
    await createTicketType(event.id, NOT_ON_SALE);
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'mediaDevices', {
        value: { getUserMedia: () => Promise.reject(new DOMException('Permission denied', 'NotAllowedError')), enumerateDevices: () => Promise.resolve([]) },
      });
    });
    await page.goto(`/staff/event-day/${event.id}`);
    await page.getByRole('button', { name: 'Scan ticket' }).click();
    await expect(page.getByText(/Allow camera access/)).toBeVisible();
  });

  test('admin door list shows how many are in', async ({ page }) => {
    const event = await doorEvent();
    await createTicketType(event.id, NOT_ON_SALE);
    const order = await paidOrder(event.id, [{ name: 'Standard', quantity: 2 }]);
    const admin = await adminApi();
    const [code] = await codesFor(admin, order.id);
    await admit(admin, event.id, code);
    await page.goto('/admin/tickets');
    await page.getByLabel('Event').selectOption(event.id);
    await page.getByRole('button', { name: 'Door list' }).click();
    await expect(page.locator('tr', { hasText: order.reference }).getByText('1 of 2 in')).toBeVisible();
  });
});

test.describe('Review fixes', () => {
  async function ticketedDoorEvent() {
    const event = await doorEvent();
    await createTicketType(event.id, NOT_ON_SALE);
    return event;
  }
  async function memberWithCard() {
    const member = await createMember();
    const uid = `04${randomBytes(6).toString('hex')}`.toUpperCase();
    await sql`INSERT INTO nfc_cards (card_uid, user_id, type) VALUES (${uid}, ${member.id}, 'vip')`;
    return { ...member, uid };
  }

  test.describe('when saving the check-in fails', () => {
    // A trigger makes this member's check-in fail, standing in for a dropped connection
    test.beforeAll(async () => {
      await sql`CREATE TABLE IF NOT EXISTS e2e_fail_checkins (user_id uuid PRIMARY KEY)`;
      await sql`
        CREATE OR REPLACE FUNCTION e2e_fail_checkin() RETURNS trigger AS $$
        BEGIN
          IF EXISTS (SELECT 1 FROM e2e_fail_checkins WHERE user_id = NEW.user_id) THEN RAISE EXCEPTION 'e2e: check-in failed'; END IF;
          RETURN NEW;
        END $$ LANGUAGE plpgsql`;
      await sql`DROP TRIGGER IF EXISTS e2e_fail_checkin ON checkins`;
      await sql`CREATE TRIGGER e2e_fail_checkin BEFORE INSERT ON checkins FOR EACH ROW EXECUTE FUNCTION e2e_fail_checkin()`;
    });
    test.afterAll(async () => {
      await sql`DROP TRIGGER IF EXISTS e2e_fail_checkin ON checkins`;
    });

    test('the ticket is put back, so a retry works', async () => {
      const event = await ticketedDoorEvent();
      const member = await memberWithCard();
      const order = await paidOrder(event.id, [{ name: 'Standard', quantity: 1 }], { member_user_id: member.id });
      await sql`INSERT INTO e2e_fail_checkins (user_id) VALUES (${member.id})`;
      const admin = await adminApi();
      const failed = await admin.post(`/api/staff/event-day/${event.id}/checkin`, { data: { card_uid: member.uid } });
      expect(failed.status()).toBe(500);
      expect((await ticketsOf(order.id))[0].admitted_at).toBeNull();

      await sql`DELETE FROM e2e_fail_checkins WHERE user_id = ${member.id}`;
      const retry = await admin.post(`/api/staff/event-day/${event.id}/checkin`, { data: { card_uid: member.uid } });
      expect(retry.status(), await retry.text()).toBe(201);
      expect((await ticketsOf(order.id))[0].admitted_via).toBe('card');
    });
  });

  test('a member who came in by QR gets checked in by card without using a guest’s ticket', async () => {
    const event = await ticketedDoorEvent();
    const member = await memberWithCard();
    const order = await paidOrder(event.id, [{ name: 'Standard', quantity: 2 }], { member_user_id: member.id });
    const admin = await adminApi();
    const [first] = await codesFor(admin, order.id);
    expect((await admit(admin, event.id, first)).status).toBe('admitted');

    const response = await admin.post(`/api/staff/event-day/${event.id}/checkin`, { data: { card_uid: member.uid } });
    expect(response.status(), await response.text()).toBe(201);
    expect((await response.json()).status).toBe('checked_in');
    const tickets = await ticketsOf(order.id);
    expect(tickets.map((t) => t.admitted_at !== null)).toEqual([true, false]);
    await expect.poll(async () => (await pointsFor(member.id)).status).toBeGreaterThan(0);
  });

  test('a card tap and a QR scan of the same ticket at once use it only once', async () => {
    for (let i = 0; i < 4; i++) {
      const event = await ticketedDoorEvent();
      const member = await memberWithCard();
      const order = await paidOrder(event.id, [{ name: 'Standard', quantity: 1 }], { member_user_id: member.id });
      const admin = await adminApi();
      const [code] = await codesFor(admin, order.id);
      const [card, qr] = await Promise.all([
        admin.post(`/api/staff/event-day/${event.id}/checkin`, { data: { card_uid: member.uid } }).then((r) => r.json()),
        admin.post(`/api/staff/event-day/${event.id}/tickets/admit`, { data: { code } }).then((r) => r.json()),
      ]);
      // One ticket is used, by exactly one of them (the card may still check the member in
      // without a ticket once theirs is in, as for a member who came in by QR)
      const cardUsedTicket = card.ticket?.status === 'admitted';
      const qrUsedTicket = qr.data?.status === 'admitted';
      expect({ i, cardUsedTicket, qrUsedTicket }).toEqual({ i, cardUsedTicket, qrUsedTicket: !cardUsedTicket });
      expect((await ticketsOf(order.id)).filter((t) => t.admitted_at !== null)).toHaveLength(1);
    }
  });
});
