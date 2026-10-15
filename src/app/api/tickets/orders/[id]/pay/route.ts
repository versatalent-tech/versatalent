import { NextRequest } from 'next/server';
import { getOrderWithToken } from '@/lib/db/repositories/tickets';
import { startTicketPayment } from '@/lib/services/ticket-payments';
import { SumUpNotConfiguredError } from '@/lib/services/sumup';
import { ApiErrors, successResponse } from '@/lib/utils/api-response';
import { isValidUUID } from '@/lib/utils/validation';

export const dynamic = 'force-dynamic';

/** POST /api/tickets/orders/[id]/pay { k } - pay again for an unpaid order */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const token = typeof body?.k === 'string' ? body.k : '';
  if (!isValidUUID(id)) return ApiErrors.NotFound('Order');

  try {
    const order = await getOrderWithToken(id, token);
    if (!order) return ApiErrors.NotFound('Order');
    const payment = await startTicketPayment(order, request.nextUrl.origin);
    return 'error' in payment ? ApiErrors.BadRequest(payment.error) : successResponse({ paymentUrl: payment.url });
  } catch (error) {
    if (error instanceof SumUpNotConfiguredError) {
      return ApiErrors.BadRequest('Online ticket payments aren’t available right now. Please try again later.');
    }
    console.error('Ticket payment restart failed:', error);
    return ApiErrors.ServerError('Payment couldn’t start. Please try again shortly.');
  }
}
