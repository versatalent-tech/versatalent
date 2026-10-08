import { NextRequest } from 'next/server';
import { bookingContext } from '@/lib/bookings/route-helpers';
import { availabilitySchema } from '@/lib/bookings/schemas';
import { parseBody } from '@/lib/crm/route-helpers';
import { canSeeTalent, createAvailability } from '@/lib/db/repositories/bookings';
import { ApiErrors, successResponse } from '@/lib/utils/api-response';

// POST /api/availability - mark days a talent can't (or might not) work
export async function POST(request: NextRequest) {
  const ctx = await bookingContext('availability.edit');
  if ('response' in ctx) return ctx.response;
  const body = await parseBody(request, availabilitySchema);
  if ('response' in body) return body.response;

  if (!canSeeTalent(ctx.scope, body.data.talent_id)) {
    return ApiErrors.BadRequest('You can only set availability for talents assigned to you');
  }
  try {
    const id = await createAvailability(ctx.actor, body.data);
    return successResponse({ id }, 'Saved', 201);
  } catch (error) {
    console.error('Error saving availability:', error);
    return ApiErrors.ServerError('Failed to save availability');
  }
}
