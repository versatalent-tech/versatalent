import { test, expect, type APIRequestContext } from '@playwright/test';
import { PDFDocument } from 'pdf-lib';
import { createEvent, createTeamUser, sql } from '../support/db';
import { adminApi, anonymousApi, teamApi } from '../support/auth';
import { paidOrder } from '../support/tickets';

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
