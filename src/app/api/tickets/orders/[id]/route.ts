import { NextRequest } from 'next/server';
import { getOrderWithToken, getPublicOrder } from '@/lib/db/repositories/tickets';
import { confirmTicketPayment } from '@/lib/services/ticket-payments';
import { ApiErrors, successResponse } from '@/lib/utils/api-response';
import { isValidUUID } from '@/lib/utils/validation';

export const dynamic = 'force-dynamic';

/**
 * GET /api/tickets/orders/[id]?k=<token> - the buyer's order page. Checks
 * with SumUp while it's unpaid. The token is in the link they were given.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const token = request.nextUrl.searchParams.get('k') ?? '';
  if (!isValidUUID(id)) return ApiErrors.NotFound('Order');

  try {
    const order = await getOrderWithToken(id, token);
    if (!order) return ApiErrors.NotFound('Order');
    if (order.status === 'pending') {
      await confirmTicketPayment(id).catch((error) => console.error('Ticket payment check failed:', error));
    }
    return successResponse(await getPublicOrder(id));
  } catch (error) {
    console.error('Ticket order status error:', error);
    return ApiErrors.ServerError('Couldn’t check your order');
  }
}
