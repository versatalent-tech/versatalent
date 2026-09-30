import { NextRequest, NextResponse } from 'next/server';
import { getOrderBySumUpClientTransactionId } from '@/lib/db/repositories/pos-orders';
import { syncReaderPayment } from '@/lib/services/pos-payments';

/**
 * POST /api/webhooks/sumup
 * SumUp calls this (the checkout's return_url) when a reader payment
 * finishes. The payload isn't signed, so it's only used to find the order;
 * the payment itself is verified by fetching the transaction from SumUp.
 *
 * 200 = handled (or nothing to do); 5xx makes SumUp retry.
 */
export async function POST(request: NextRequest) {
  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const clientTransactionId = body?.payload?.client_transaction_id;
  if (typeof clientTransactionId !== 'string' || !clientTransactionId) {
    return NextResponse.json({ received: true, ignored: 'no client_transaction_id' });
  }

  try {
    const order = await getOrderBySumUpClientTransactionId(clientTransactionId);
    if (!order) {
      console.warn(`[sumup webhook] No order for client_transaction_id ${clientTransactionId}`);
      return NextResponse.json({ received: true, ignored: 'unknown transaction' });
    }

    const payment = await syncReaderPayment(order);
    console.log(`[sumup webhook] Order ${order.id}: ${payment.status}`);
    return NextResponse.json({ received: true, status: payment.status });
  } catch (error) {
    console.error('[sumup webhook] Error:', error);
    return NextResponse.json({ error: 'Processing failed' }, { status: 500 });
  }
}
