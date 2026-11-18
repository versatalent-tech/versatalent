import { test, expect } from '@playwright/test';
import { PDFDocument } from 'pdf-lib';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { createEvent, sql } from '../support/db';
import { adminApi, anonymousApi } from '../support/auth';
import { paidOrder } from '../support/tickets';

/**
 * Buyers download their PDF tickets from their private order page as soon as
 * they've paid (the email follows, sent by hand from Customer messages).
 */

async function tokenOf(orderId: string): Promise<string> {
  const [row] = await sql`SELECT access_token FROM ticket_orders WHERE id = ${orderId}`;
  return row.access_token;
}

async function codesOf(orderId: string): Promise<string[]> {
  return (await sql`SELECT code FROM tickets WHERE order_id = ${orderId} ORDER BY number`).map((r) => r.code);
}

const pdfUrl = (orderId: string, token: string) => `/api/tickets/orders/${orderId}/pdf?k=${encodeURIComponent(token)}`;

test.describe('Buyer ticket download', () => {
  test('right link downloads the PDF', async () => {
    const event = await createEvent({ startsInDays: 7 });
    const order = await paidOrder(event.id, [{ name: 'Standard', quantity: 2 }]);
    const buyer = await anonymousApi();
    const response = await buyer.get(pdfUrl(order.id, await tokenOf(order.id)));
    expect(response.status(), await response.text()).toBe(200);
    expect(response.headers()['content-type']).toContain('application/pdf');
    expect(response.headers()['content-disposition']).toContain(`${order.reference}.pdf`);
    const pdf = await PDFDocument.load(await response.body());
    expect(pdf.getPageCount()).toBe(2);
    const [stored] = await sql`SELECT pdf_key FROM ticket_orders WHERE id = ${order.id}`;
    expect(stored.pdf_key).toBe(`tickets/${order.id}.pdf`);
  });

  test('wrong link or unpaid order is refused', async () => {
    const event = await createEvent({ startsInDays: 7 });
    const buyer = await anonymousApi();
    const paid = await paidOrder(event.id, [{ name: 'Standard', quantity: 1 }]);
    expect((await buyer.get(pdfUrl(paid.id, 'f'.repeat(32)))).status()).toBe(404);
    expect((await buyer.get(`/api/tickets/orders/${paid.id}/pdf`)).status()).toBe(404);

    for (const status of ['pending', 'refunded', 'cancelled']) {
      const order = await paidOrder(event.id, [{ name: 'Standard', quantity: 1 }], { status });
      const response = await buyer.get(pdfUrl(order.id, await tokenOf(order.id)));
      expect(response.status(), status).toBe(409);
      expect(await codesOf(order.id), status).toHaveLength(0);
    }
  });

  test('second download is the same file, tickets not duplicated', async () => {
    const event = await createEvent({ startsInDays: 7 });
    const order = await paidOrder(event.id, [{ name: 'Standard', quantity: 3 }]);
    const buyer = await anonymousApi();
    const url = pdfUrl(order.id, await tokenOf(order.id));
    const [a, b] = await Promise.all([buyer.get(url), buyer.get(url)]);
    expect([a.status(), b.status()]).toEqual([200, 200]);
    expect(await codesOf(order.id)).toHaveLength(3);

    const [before] = await sql`SELECT pdf_created_at FROM ticket_orders WHERE id = ${order.id}`;
    expect((await buyer.get(url)).status()).toBe(200);
    const [after] = await sql`SELECT pdf_created_at FROM ticket_orders WHERE id = ${order.id}`;
    expect(after.pdf_created_at).toEqual(before.pdf_created_at);
  });

  test('admin remake keeps the same QR codes', async () => {
    const event = await createEvent({ startsInDays: 7 });
    const order = await paidOrder(event.id, [{ name: 'Standard', quantity: 2 }]);
    const buyer = await anonymousApi();
    expect((await buyer.get(pdfUrl(order.id, await tokenOf(order.id)))).status()).toBe(200);
    const codes = await codesOf(order.id);
    const admin = await adminApi();
    expect((await admin.post(`/api/admin/tickets/orders/${order.id}/pdf`)).status()).toBe(200);
    expect(await codesOf(order.id)).toEqual(codes);
  });

  test('missing stored file is remade', async () => {
    const event = await createEvent({ startsInDays: 7 });
    const order = await paidOrder(event.id, [{ name: 'Standard', quantity: 1 }]);
    const buyer = await anonymousApi();
    const url = pdfUrl(order.id, await tokenOf(order.id));
    expect((await buyer.get(url)).status()).toBe(200);
    await fs.rm(path.join(process.cwd(), '.private-uploads', 'documents', `${order.id}.pdf`), { force: true });
    const again = await buyer.get(url);
    expect(again.status(), await again.text()).toBe(200);
    expect((await PDFDocument.load(await again.body())).getPageCount()).toBe(1);
  });

  test('order page shows the download and the email message', async ({ page }) => {
    const event = await createEvent({ startsInDays: 7 });
    const order = await paidOrder(event.id, [{ name: 'Standard', quantity: 1 }]);
    const token = await tokenOf(order.id);
    await page.goto(`/tickets/order/${order.id}?k=${token}`);
    const link = page.getByRole('link', { name: 'Download your tickets (PDF)' });
    await expect(link).toHaveAttribute('href', pdfUrl(order.id, token));
    await expect(page.getByText(`We'll also email your tickets to ${order.email} within 24 hours`)).toBeVisible();
    const download = page.waitForEvent('download');
    await link.click();
    expect((await download).suggestedFilename()).toMatch(new RegExp(`${order.reference}\\.pdf$`));
  });

  test('then shows in the confirmation queue with a PDF', async () => {
    const event = await createEvent({ startsInDays: 7 });
    const order = await paidOrder(event.id, [{ name: 'Standard', quantity: 1 }]);
    const buyer = await anonymousApi();
    expect((await buyer.get(pdfUrl(order.id, await tokenOf(order.id)))).status()).toBe(200);
    const admin = await adminApi();
    const response = await admin.get(`/api/admin/messages?queue=confirmation&event=${event.id}`);
    const candidate = (await response.json()).data.candidates.find((c: any) => c.order_id === order.id);
    expect(candidate.has_pdf).toBe(true);
  });
});
