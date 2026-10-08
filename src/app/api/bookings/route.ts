import { NextRequest } from 'next/server';
import { bookingContext, readRange } from '@/lib/bookings/route-helpers';
import { checkBookingLinks, clashResponse } from '@/lib/bookings/checks';
import { bookingSchema } from '@/lib/bookings/schemas';
import { parseBody } from '@/lib/crm/route-helpers';
import {
  createBooking,
  getBooking,
  listAvailability,
  listBookings,
  listBookingsForDeal,
  listPublicEvents,
} from '@/lib/db/repositories/bookings';
import { logAudit } from '@/lib/db/repositories/audit-log';
import { can } from '@/lib/auth/permissions';
import { ApiErrors, successResponse } from '@/lib/utils/api-response';
import { isValidUUID } from '@/lib/utils/validation';

export const dynamic = 'force-dynamic';

/**
 * GET /api/bookings?from=&to=&talentId=  - calendar data (bookings, availability, public events)
 * GET /api/bookings?dealId=               - bookings made from one deal
 */
export async function GET(request: NextRequest) {
  const ctx = await bookingContext('bookings.view');
  if ('response' in ctx) return ctx.response;
  const params = request.nextUrl.searchParams;

  try {
    const dealId = params.get('dealId');
    if (dealId) {
      if (!isValidUUID(dealId)) return ApiErrors.BadRequest('Invalid deal');
      return successResponse(await listBookingsForDeal(ctx.scope, ctx.withMoney, dealId));
    }

    const range = readRange(params);
    if (!range) return ApiErrors.BadRequest('Give a from/to date range of up to 400 days');
    const talentParam = params.get('talentId');
    const talentId = talentParam && isValidUUID(talentParam) ? talentParam : undefined;

    const [bookings, availability, events] = await Promise.all([
      listBookings(ctx.scope, ctx.withMoney, { ...range, talentId }),
      listAvailability(ctx.scope, { ...range, talentId }),
      talentId ? Promise.resolve([]) : listPublicEvents(ctx.scope, range.from, range.to),
    ]);
    return successResponse({ bookings, availability, events });
  } catch (error) {
    console.error('Error loading calendar:', error);
    return ApiErrors.ServerError('Failed to load the calendar');
  }
}

// POST /api/bookings - create a booking (admins and managers)
export async function POST(request: NextRequest) {
  const ctx = await bookingContext('bookings.edit');
  if ('response' in ctx) return ctx.response;
  const body = await parseBody(request, bookingSchema);
  if ('response' in body) return body.response;
  const data = { ...body.data };

  try {
    if (!ctx.withMoney) {
      delete data.fee_cents;
      delete data.commission_percent;
    }
    if (!can(ctx.session.role, 'bookings.client_visibility')) data.client_visible_to_talent = false;

    const problem = await checkBookingLinks(ctx, data);
    if (problem) return ApiErrors.BadRequest(problem);

    // Schema guarantees these (the project isn't in strict mode, so TS sees them as optional)
    const clash = await clashResponse(
      { talent_id: data.talent_id!, starts_at: data.starts_at!, ends_at: data.ends_at!, status: data.status! },
      data.force
    );
    if (clash) return clash;

    const id = await createBooking(ctx.actor, data);
    await logAudit(ctx.actor, 'create', 'booking', id, { after: { title: data.title, status: data.status, starts_at: data.starts_at } });
    return successResponse(await getBooking(ctx.scope, ctx.withMoney, id), 'Booking created', 201);
  } catch (error) {
    console.error('Error creating booking:', error);
    return ApiErrors.ServerError('Failed to create booking');
  }
}
