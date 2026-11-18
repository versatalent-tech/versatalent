import { NextRequest, NextResponse } from 'next/server';
import { getOrderWithToken } from '@/lib/db/repositories/tickets';
import { getPdfOrder } from '@/lib/db/repositories/door-tickets';
import { currentOrderPdf, ticketPdfResponse } from '@/lib/tickets/order-pdf';
import { ApiErrors } from '@/lib/utils/api-response';
import { isValidUUID } from '@/lib/utils/validation';

export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ id: string }> };

/**
 * GET /api/tickets/orders/[id]/pdf?k=<token> - the buyer's PDF tickets, from
 * the private link on their order page. Made the first time it's asked for
 * (the same file the admin makes), then served from storage until the event
 * or the ticket design changes.
 */
export async function GET(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const token = request.nextUrl.searchParams.get('k') ?? '';
  if (!isValidUUID(id)) return ApiErrors.NotFound('Order');

  try {
    if (!(await getOrderWithToken(id, token))) return ApiErrors.NotFound('Order');
    const order = await getPdfOrder(id);
    if (!order) return ApiErrors.NotFound('Order');
    if (order.status !== 'paid') {
      return NextResponse.json({ success: false, error: 'Your tickets are ready once payment is confirmed' }, { status: 409 });
    }
    return ticketPdfResponse(order, await currentOrderPdf(order));
  } catch (error) {
    console.error('Error downloading buyer ticket PDF:', error);
    return ApiErrors.ServerError("We couldn't make your tickets. Please try again.");
  }
}
