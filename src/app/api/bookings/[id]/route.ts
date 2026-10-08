import { NextRequest } from 'next/server';
import { bookingContext } from '@/lib/bookings/route-helpers';
import { checkBookingLinks, clashResponse } from '@/lib/bookings/checks';
import { LOGISTICS_FIELDS, bookingUpdateSchema } from '@/lib/bookings/schemas';
import { parseBody } from '@/lib/crm/route-helpers';
import { deleteBooking, getBooking, updateBooking } from '@/lib/db/repositories/bookings';
import { logAudit } from '@/lib/db/repositories/audit-log';
import { can } from '@/lib/auth/permissions';
import { ApiErrors, successResponse } from '@/lib/utils/api-response';
import { isValidUUID } from '@/lib/utils/validation';

type Params = { params: Promise<{ id: string }> };

// GET /api/bookings/[id]
export async function GET(_request: NextRequest, { params }: Params) {
  const ctx = await bookingContext('bookings.view');
  if ('response' in ctx) return ctx.response;
  const { id } = await params;
  if (!isValidUUID(id)) return ApiErrors.NotFound('Booking');

  try {
    const booking = await getBooking(ctx.scope, ctx.withMoney, id);
    return booking ? successResponse(booking) : ApiErrors.NotFound('Booking');
  } catch (error) {
    console.error('Error loading booking:', error);
    return ApiErrors.ServerError('Failed to load booking');
  }
}

/**
 * PATCH /api/bookings/[id]
 * Admins and managers can change anything; road managers only the call time
 * and logistics notes.
 */
export async function PATCH(request: NextRequest, { params }: Params) {
  const ctx = await bookingContext('bookings.view');
  if ('response' in ctx) return ctx.response;
  const { id } = await params;
  if (!isValidUUID(id)) return ApiErrors.NotFound('Booking');

  const body = await parseBody(request, bookingUpdateSchema);
  if ('response' in body) return body.response;
  const { force, ...changes } = body.data;
  const role = ctx.session.role;

  const fields = Object.keys(changes);
  if (!can(role, 'bookings.edit')) {
    const allowed = can(role, 'bookings.logistics') && fields.every((f) => (LOGISTICS_FIELDS as readonly string[]).includes(f));
    if (!allowed) return ApiErrors.Forbidden('You can only update the call time and logistics notes');
  }
  if (!ctx.withMoney && (fields.includes('fee_cents') || fields.includes('commission_percent'))) {
    return ApiErrors.Forbidden('You can’t change fees');
  }
  if (fields.includes('client_visible_to_talent') && !can(role, 'bookings.client_visibility')) {
    return ApiErrors.Forbidden('You can’t change what the talent sees');
  }

  try {
    const before = await getBooking(ctx.scope, true, id);
    if (!before) return ApiErrors.NotFound('Booking');

    const problem = await checkBookingLinks(ctx, changes);
    if (problem) return ApiErrors.BadRequest(problem);

    const timingChanged = ['talent_id', 'starts_at', 'ends_at', 'status'].some((f) => fields.includes(f));
    if (timingChanged) {
      const clash = await clashResponse(
        {
          talent_id: changes.talent_id ?? before.talent.id,
          starts_at: changes.starts_at ?? before.starts_at,
          ends_at: changes.ends_at ?? before.ends_at,
          status: changes.status ?? before.status,
        },
        force,
        id
      );
      if (clash) return clash;
    }

    await updateBooking(ctx.scope, ctx.actor, id, changes);
    const after = await getBooking(ctx.scope, true, id);
    await logAudit(ctx.actor, 'update', 'booking', id, {
      before: { status: before.status, starts_at: before.starts_at, fee_cents: before.money?.fee_cents ?? null },
      after: after && { status: after.status, starts_at: after.starts_at, fee_cents: after.money?.fee_cents ?? null },
    });
    return successResponse(await getBooking(ctx.scope, ctx.withMoney, id), 'Booking updated');
  } catch (error) {
    console.error('Error updating booking:', error);
    return ApiErrors.ServerError('Failed to update booking');
  }
}

// DELETE /api/bookings/[id] - admins only; otherwise set the status to cancelled
export async function DELETE(_request: NextRequest, { params }: Params) {
  const ctx = await bookingContext('bookings.edit');
  if ('response' in ctx) return ctx.response;
  if (!can(ctx.session.role, 'crm.delete')) return ApiErrors.Forbidden('Only admins can delete bookings; cancel it instead');
  const { id } = await params;
  if (!isValidUUID(id)) return ApiErrors.NotFound('Booking');

  try {
    const booking = await getBooking(ctx.scope, false, id);
    if (!booking) return ApiErrors.NotFound('Booking');
    await deleteBooking(id);
    await logAudit(ctx.actor, 'delete', 'booking', id, { before: { title: booking.title, talent: booking.talent.name } });
    return successResponse(null, 'Booking deleted');
  } catch (error) {
    console.error('Error deleting booking:', error);
    return ApiErrors.ServerError('Failed to delete booking');
  }
}
