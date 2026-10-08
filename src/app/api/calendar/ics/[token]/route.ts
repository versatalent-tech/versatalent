import { NextRequest, NextResponse } from 'next/server';
import { buildCalendar } from '@/lib/bookings/ical';
import { getBookingScope, listAvailability, listBookings, resolveCalendarFeed } from '@/lib/db/repositories/bookings';

export const dynamic = 'force-dynamic';

const DAY = 24 * 60 * 60 * 1000;

/**
 * GET /api/calendar/ics/<token>.ics - a person's bookings as a calendar
 * subscription. The secret token in the URL is the only credential, so the
 * response is never cached and contains no money.
 */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token: raw } = await params;
  const token = raw.replace(/\.ics$/, '');
  if (!/^[A-Za-z0-9_-]{20,100}$/.test(token)) return new NextResponse('Not found', { status: 404 });

  try {
    const owner = await resolveCalendarFeed(token);
    if (!owner) return new NextResponse('Not found', { status: 404 });

    const scope = await getBookingScope(owner);
    const range = {
      from: new Date(Date.now() - 60 * DAY).toISOString(),
      to: new Date(Date.now() + 365 * DAY).toISOString(),
    };
    const [bookings, availability] = await Promise.all([
      listBookings(scope, false, range),
      listAvailability(scope, range),
    ]);

    const body = buildCalendar(
      `VersaTalent bookings (${owner.name})`,
      bookings.filter((b) => b.status !== 'cancelled'),
      availability
    );
    return new NextResponse(body, {
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': 'inline; filename="versatalent.ics"',
        'Cache-Control': 'private, no-store',
        'Referrer-Policy': 'no-referrer',
      },
    });
  } catch (error) {
    console.error('Error building calendar feed:', error);
    return new NextResponse('Calendar unavailable', { status: 500 });
  }
}
