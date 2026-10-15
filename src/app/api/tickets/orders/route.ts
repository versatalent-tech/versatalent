import { NextRequest } from 'next/server';
import { createTicketOrder, getPayableOrder } from '@/lib/db/repositories/tickets';
import { ticketOrderSchema } from '@/lib/tickets/schemas';
import { completeFreeOrder, startTicketPayment } from '@/lib/services/ticket-payments';
import { SumUpNotConfiguredError } from '@/lib/services/sumup';
import { getClientIp, isLoginThrottled, recordLoginAttempt } from '@/lib/auth/login-throttle';
import { ApiErrors, successResponse } from '@/lib/utils/api-response';
import { HONEYPOT_FIELD } from '@/lib/crm/types';

export const dynamic = 'force-dynamic';

/**
 * POST /api/tickets/orders - buy tickets. Creates the order (holding the
 * tickets for a while) and returns SumUp's payment page, or the order page
 * straight away for free tickets.
 */
export async function POST(request: NextRequest) {
  const json = await request.json().catch(() => undefined);
  if (json && typeof json === 'object' && json[HONEYPOT_FIELD]) return ApiErrors.BadRequest('Please check your details');
  const parsed = ticketOrderSchema.safeParse(json);
  if (!parsed.success) return ApiErrors.BadRequest(parsed.error.issues[0]?.message ?? 'Please check your details');
  const input = parsed.data;

  // Each order started counts towards a limit per email and per connection
  const ip = getClientIp(request);
  const key = `ticket-buy:${input.email}`;
  if (await isLoginThrottled(key, ip)) return ApiErrors.BadRequest('Too many orders started. Please try again in 15 minutes.');
  await recordLoginAttempt(key, ip, false);

  try {
    const created = await createTicketOrder(input as Parameters<typeof createTicketOrder>[0]);
    if ('error' in created) return ApiErrors.BadRequest(created.error);

    const orderPage = `/tickets/order/${created.id}?k=${encodeURIComponent(created.token)}`;
    if (created.total_cents === 0) {
      await completeFreeOrder(created.id);
      return successResponse({ orderId: created.id, orderUrl: orderPage, paymentUrl: null });
    }

    const order = await getPayableOrder(created.id);
    const payment = await startTicketPayment(order!, request.nextUrl.origin);
    if ('error' in payment) return ApiErrors.BadRequest(payment.error);
    return successResponse({ orderId: created.id, orderUrl: orderPage, paymentUrl: payment.url });
  } catch (error) {
    if (error instanceof SumUpNotConfiguredError) {
      return ApiErrors.BadRequest('Online ticket payments aren’t available right now. Please try again later.');
    }
    console.error('Ticket order failed to start:', error);
    return ApiErrors.ServerError('Payment couldn’t start. Please try again shortly.');
  }
}
