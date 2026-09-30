import { NextRequest, NextResponse } from 'next/server';
import { withPOSAuth } from '@/lib/auth/pos-auth';
import { terminateReaderCheckout } from '@/lib/services/sumup';
import { sumupErrorResponse } from '@/lib/utils/sumup-errors';

/**
 * POST /api/pos/sumup/cancel { readerId }
 * Cancels the payment waiting on the reader (only possible while it is
 * waiting for a card or PIN). SumUp then reports it as failed.
 */
export const POST = withPOSAuth(async (request: NextRequest) => {
  try {
    const { readerId } = await request.json();
    if (!readerId) {
      return NextResponse.json({ error: 'readerId is required' }, { status: 400 });
    }
    await terminateReaderCheckout(readerId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return sumupErrorResponse(error, 'cancel the payment on the reader');
  }
});
