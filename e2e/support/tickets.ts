import type { APIRequestContext } from '@playwright/test';
import { randomInt } from 'node:crypto';

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
