import { NextRequest, NextResponse } from 'next/server';
import { confirmAnyCheckout } from '@/lib/services/membership-payments';

/**
 * POST /api/webhooks/sumup-online
 * SumUp's per-checkout callback (the hosted checkout's return_url):
 * { "event_type": "CHECKOUT_STATUS_CHANGED", "id": "<checkout id>" }.
 * It isn't signed, so it only tells us which checkout to re-read from SumUp.
 * 2xx = handled or nothing to do; 5xx makes SumUp retry (1m, 5m, 20m, 2h).
 */
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  if (body?.event_type !== 'CHECKOUT_STATUS_CHANGED' || typeof body?.id !== 'string') {
    return new NextResponse(null, { status: 204 }); // unknown events are ignored
  }

  try {
    // Any payment page we ever created (card fee or Founding Membership), not just the latest
    const result = await confirmAnyCheckout(body.id);
    if (result) console.log(`[sumup-online] Checkout ${body.id}: ${result}`);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('[sumup-online] Error:', error);
    return new NextResponse(null, { status: 500 });
  }
}
