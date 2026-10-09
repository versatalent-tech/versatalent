import { NextRequest, NextResponse } from 'next/server';
import { getCheckoutRecord } from '@/lib/db/repositories/membership';
import { confirmCheckout } from '@/lib/services/membership-payments';

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
    // Any payment page we ever created for a card request, not just the latest
    const record = await getCheckoutRecord(body.id);
    if (!record) return new NextResponse(null, { status: 204 });
    const state = await confirmCheckout(record);
    console.log(`[sumup-online] Card request ${record.request_id}, checkout ${record.checkout_id}: ${state}`);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('[sumup-online] Error:', error);
    return new NextResponse(null, { status: 500 });
  }
}
