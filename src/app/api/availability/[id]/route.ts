import { NextRequest } from 'next/server';
import { bookingContext } from '@/lib/bookings/route-helpers';
import { deleteAvailability } from '@/lib/db/repositories/bookings';
import { ApiErrors, successResponse } from '@/lib/utils/api-response';
import { isValidUUID } from '@/lib/utils/validation';

// DELETE /api/availability/[id]
export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await bookingContext('availability.edit');
  if ('response' in ctx) return ctx.response;
  const { id } = await params;
  if (!isValidUUID(id)) return ApiErrors.NotFound('Entry');

  try {
    return (await deleteAvailability(ctx.scope, id)) ? successResponse(null, 'Removed') : ApiErrors.NotFound('Entry');
  } catch (error) {
    console.error('Error removing availability:', error);
    return ApiErrors.ServerError('Failed to remove');
  }
}
