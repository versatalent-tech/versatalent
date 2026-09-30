import { NextRequest, NextResponse } from 'next/server';
import { withPOSAuth } from '@/lib/auth/pos-auth';
import { getOrderById, setOrderSumUpCheckout } from '@/lib/db/repositories/pos-orders';
import { createReaderCheckout } from '@/lib/services/sumup';
import { sumupErrorResponse } from '@/lib/utils/sumup-errors';
import { formatCurrency } from '@/lib/utils/formatting';
import { SITE_URL } from '@/lib/site-url';

// SumUp's minimum card payment
const MINIMUM_CENTS = 100;

/**
 * POST /api/pos/sumup/checkout { orderId, readerId }
 * Sends the order total to a Solo reader. The result arrives via the
 * webhook; the till polls /api/pos/sumup/status meanwhile.
 */
export const POST = withPOSAuth(async (request: NextRequest) => {
  try {
    const { orderId, readerId } = await request.json();
    if (!orderId || !readerId) {
      return NextResponse.json({ error: 'orderId and readerId are required' }, { status: 400 });
    }

    const order = await getOrderById(orderId);
    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }
    if (order.status !== 'pending') {
      return NextResponse.json({ error: `Order is already ${order.status}` }, { status: 400 });
    }
    if (order.total_cents < MINIMUM_CENTS) {
      return NextResponse.json(
        { error: `Card payments must be at least ${formatCurrency(MINIMUM_CENTS, order.currency)}` },
        { status: 400 }
      );
    }

    const { clientTransactionId } = await createReaderCheckout({
      readerId,
      orderId: order.id,
      amountCents: order.total_cents,
      currency: order.currency,
      description: `VersaTalent order ${order.id.slice(0, 8)}`,
      returnUrl: `${SITE_URL}/api/webhooks/sumup`,
    });
    await setOrderSumUpCheckout(order.id, clientTransactionId);

    return NextResponse.json({ ok: true });
  } catch (error) {
    return sumupErrorResponse(error, 'send the payment to the reader');
  }
});
