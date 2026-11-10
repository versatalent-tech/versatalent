import { test, expect } from '@playwright/test';
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
