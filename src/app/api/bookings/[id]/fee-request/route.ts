import { NextRequest } from 'next/server';
import { bookingContext } from '@/lib/bookings/route-helpers';
import { getBooking } from '@/lib/db/repositories/bookings';
import { latestFeeRequest, withdrawFeeRequest } from '@/lib/db/repositories/fee-requests';
import { logAudit } from '@/lib/db/repositories/audit-log';
import { ApiErrors, successResponse } from '@/lib/utils/api-response';
import { isValidUUID } from '@/lib/utils/validation';

type Params = { params: Promise<{ id: string }> };

// GET /api/bookings/[id]/fee-request - the booking's waiting fee change, or its latest decision (people who see fees)
export async function GET(_request: NextRequest, { params }: Params) {
  const ctx = await bookingContext('bookings.fees');
  if ('response' in ctx) return ctx.response;
  const { id } = await params;
  if (!isValidUUID(id) || !(await getBooking(ctx.scope, false, id))) return ApiErrors.NotFound('Booking');
  try {
    return successResponse(await latestFeeRequest(id));
  } catch (error) {
    console.error('Error loading fee request:', error);
    return ApiErrors.ServerError('Failed to load the fee change');
  }
}

// DELETE /api/bookings/[id]/fee-request - withdraw the waiting fee change
export async function DELETE(_request: NextRequest, { params }: Params) {
  const ctx = await bookingContext('bookings.fees');
  if ('response' in ctx) return ctx.response;
  const { id } = await params;
  if (!isValidUUID(id) || !(await getBooking(ctx.scope, false, id))) return ApiErrors.NotFound('Booking');
  try {
    const withdrawn = await withdrawFeeRequest(id);
    if (!withdrawn) return ApiErrors.NotFound('Waiting fee change');
    await logAudit(ctx.actor, 'fee_request_withdrawn', 'booking', id, {
      before: { fee_cents: withdrawn.fee_cents, commission_percent: withdrawn.commission_percent, currency: withdrawn.currency },
    });
    return successResponse(null, 'Fee change withdrawn');
  } catch (error) {
    console.error('Error withdrawing fee request:', error);
    return ApiErrors.ServerError('Failed to withdraw the fee change');
  }
}
