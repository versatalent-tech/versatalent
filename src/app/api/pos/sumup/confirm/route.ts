import { NextRequest, NextResponse } from 'next/server';
import { withPOSAuth } from '@/lib/auth/pos-auth';
import { confirmAppPayment } from '@/lib/services/pos-payments';
import { sumupErrorResponse } from '@/lib/utils/sumup-errors';

/**
 * POST /api/pos/sumup/confirm { orderId, transactionCode }
 * For payments taken in the SumUp app (e.g. Tap to Pay on iPhone): looks the
 * transaction up with SumUp and completes the order if it succeeded for the
 * exact amount and hasn't been used for another order.
 */
export const POST = withPOSAuth(async (request: NextRequest) => {
  try {
    const { orderId, transactionCode } = await request.json();
    const code = typeof transactionCode === 'string' ? transactionCode.trim().toUpperCase() : '';
    if (!orderId || !/^[A-Z0-9]{6,20}$/.test(code)) {
      return NextResponse.json(
        { error: 'Enter the transaction code from the SumUp receipt (letters and numbers)' },
        { status: 400 }
      );
    }

    const outcome = await confirmAppPayment(orderId, code);
    if (!outcome.ok) {
      return NextResponse.json({ error: outcome.reason }, { status: 400 });
    }
    return NextResponse.json({ status: 'paid', pointsAwarded: outcome.result?.pointsAwarded ?? 0 });
  } catch (error) {
    return sumupErrorResponse(error, 'confirm the SumUp payment');
  }
});
