import { NextRequest } from 'next/server';
import { bookingContext } from '@/lib/bookings/route-helpers';
import { clearPayout, getBooking } from '@/lib/db/repositories/bookings';
import { logAudit } from '@/lib/db/repositories/audit-log';
import { ApiErrors, successResponse } from '@/lib/utils/api-response';
import { isValidUUID } from '@/lib/utils/validation';

// DELETE /api/payouts/[bookingId] - undo a payment recorded by mistake
export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ bookingId: string }> }) {
  const ctx = await bookingContext('payouts.manage');
  if ('response' in ctx) return ctx.response;
  const { bookingId } = await params;
  if (!isValidUUID(bookingId)) return ApiErrors.NotFound('Payment');

  try {
    const before = await getBooking(ctx.scope, true, bookingId);
    if (!before || !(await clearPayout(ctx.scope, bookingId))) return ApiErrors.NotFound('Payment');
    await logAudit(ctx.actor, 'talent_payment_undone', 'booking', bookingId, {
      before: { paid_at: before.money?.paid_at, paid_cents: before.money?.paid_cents, reference: before.money?.paid_reference },
    });
    return successResponse(null, 'Payment removed');
  } catch (error) {
    console.error('Error undoing payout:', error);
    return ApiErrors.ServerError('Failed to undo');
  }
}
