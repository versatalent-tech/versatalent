import type { APIRequestContext } from '@playwright/test';
import { randomBytes, randomInt } from 'node:crypto';
import { sql, uniq } from './db';

/**
 * A different pretend connection address per buyer, so the "too many orders
 * from one connection" limit doesn't trip across the whole test run
 */
export const fakeIp = () => `10.${randomInt(255)}.${randomInt(255)}.${randomInt(1, 255)}`;

export interface Buyer {
  first_name?: string;
  last_name?: string;
  email: string;
  instagram?: string;
  [key: string]: unknown;
}

/** POST /api/tickets/orders; returns the raw response */
export function placeOrder(
  request: APIRequestContext,
  eventId: string,
  items: { ticket_type_id: string; quantity: number }[],
  buyer: Buyer,
  ip = fakeIp()
) {
  return request.post('/api/tickets/orders', {
    headers: { 'x-nf-client-connection-ip': ip },
    data: {
      event_id: eventId,
      items,
      first_name: 'Ada',
      last_name: 'Tester',
      instagram: '@ada.tester',
      accept_terms: true,
      ...buyer,
    },
  });
}

/** Place an order that must succeed; returns its id, token and links */
export async function startOrder(request: APIRequestContext, eventId: string, items: { ticket_type_id: string; quantity: number }[], buyer: Buyer) {
  const response = await placeOrder(request, eventId, items, buyer);
  const body = await response.json();
  if (!response.ok()) throw new Error(`Order failed: ${body.error}`);
  const orderUrl: string = body.data.orderUrl;
  const token = new URL(orderUrl, 'http://x').searchParams.get('k')!;
  return { id: body.data.orderId as string, token, orderUrl, paymentUrl: body.data.paymentUrl as string | null };
}

/** The buyer's order page data (this also checks the payment with SumUp) */
export async function orderStatus(request: APIRequestContext, orderId: string, token: string) {
  const response = await request.get(`/api/tickets/orders/${orderId}?k=${encodeURIComponent(token)}`);
  return { status: response.status(), body: await response.json() };
}

/**
 * A paid order straight in the database (no checkout), for door tests.
 * Items are { name, quantity } at £10 each.
 */
export async function paidOrder(
  eventId: string,
  items: { name: string; quantity: number }[],
  buyer: { email?: string; first_name?: string; last_name?: string; member_user_id?: string; status?: string } = {}
): Promise<{ id: string; reference: string; email: string; last_name: string }> {
  const quantity = items.reduce((n, i) => n + i.quantity, 0);
  const reference = uniq('VT').toUpperCase();
  const email = buyer.email ?? `${uniq('buyer')}@example.com`;
  const lastName = buyer.last_name ?? uniq('Buyer');
  const [order] = await sql`
    INSERT INTO ticket_orders (
      reference, access_token, event_id, event_title, status, quantity, total_cents, hold_until,
      first_name, last_name, email, instagram, terms_accepted_at, paid_at, member_user_id
    )
    SELECT ${reference}, ${randomBytes(16).toString('hex')}, e.id, e.title, ${buyer.status ?? 'paid'}, ${quantity}, ${quantity * 1000}, NOW(),
      ${buyer.first_name ?? 'Ada'}, ${lastName}, ${email}, 'ada.tester', NOW(), NOW(), ${buyer.member_user_id ?? null}
    FROM events e WHERE e.id = ${eventId}
    RETURNING id
  `;
  for (const item of items) {
    await sql`INSERT INTO ticket_order_items (order_id, name, unit_price_cents, quantity) VALUES (${order.id}, ${item.name}, 1000, ${item.quantity})`;
  }
  return { id: order.id, reference, email, last_name: lastName };
}
