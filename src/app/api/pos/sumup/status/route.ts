import { NextRequest, NextResponse } from 'next/server';
import { withPOSAuth } from '@/lib/auth/pos-auth';
import { getOrderById } from '@/lib/db/repositories/pos-orders';
import { syncReaderPayment } from '@/lib/services/pos-payments';
import { sumupErrorResponse } from '@/lib/utils/sumup-errors';

/**
 * GET /api/pos/sumup/status?orderId=...
 * The till polls this while the customer pays on the reader. Checks SumUp
 * directly, so the sale completes even if the webhook is slow.
 */
export const GET = withPOSAuth(async (request: NextRequest) => {
  try {
    const orderId = request.nextUrl.searchParams.get('orderId');
    if (!orderId) {
      return NextResponse.json({ error: 'orderId is required' }, { status: 400 });
    }
    const order = await getOrderById(orderId);
    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const payment = await syncReaderPayment(order);
    if (payment.status === 'paid') {
      return NextResponse.json({
        status: 'paid',
        pointsAwarded: payment.result.pointsAwarded,
      });
    }
    return NextResponse.json(payment);
  } catch (error) {
    return sumupErrorResponse(error, 'check the payment');
  }
});
