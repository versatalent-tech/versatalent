import { NextRequest, NextResponse } from 'next/server';
import { buildCalendar } from '@/lib/bookings/ical';
import { getBookingScope, listAvailability, listBookings, resolveCalendarFeed } from '@/lib/db/repositories/bookings';
import { listTalentBookings } from '@/lib/db/repositories/portal';
import type { Availability, Booking } from '@/lib/bookings/types';
import type { TalentBooking } from '@/lib/portal/types';

export const dynamic = 'force-dynamic';

const DAY = 24 * 60 * 60 * 1000;

/** Shape a talent-facing booking for the iCal writer (no money; client only if shown to the talent) */
function talentBookingForFeed(b: TalentBooking, talentId: string, label: string): Booking {
  return {
    id: b.id,
    title: b.title,
    status: b.status,
    starts_at: b.starts_at,
    ends_at: b.ends_at,
    location: b.location,
    call_time: b.call_time,
    brief: b.brief,
    logistics_notes: b.logistics_notes,
    onsite_contact: b.onsite_contact,
    talent: { id: talentId, name: label },
    deal: null,
    client: b.client_name ? { id: '', name: b.client_name } : null,
    event: null,
    client_visible_to_talent: Boolean(b.client_name),
    shared_with_talent: true,
    talent_response: b.talent_response,
    created_at: b.starts_at,
    updated_at: b.starts_at,
  };
}

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

    const range = {
      from: new Date(Date.now() - 60 * DAY).toISOString(),
      to: new Date(Date.now() + 365 * DAY).toISOString(),
    };

    let bookings: Booking[];
    let availability: Availability[];
    if (owner.kind === 'talent') {
      // A talent's own feed: only bookings shared with them, client name only if allowed
      const scope = { all: false, talentIds: [owner.talentId] };
      const [upcoming, past, days] = await Promise.all([
        listTalentBookings(owner.talentId, 'upcoming', 500),
        listTalentBookings(owner.talentId, 'past', 100),
        listAvailability(scope, range),
      ]);
      // In their own calendar, label events as VersaTalent jobs rather than with their name
      bookings = [...past, ...upcoming].map((b) => talentBookingForFeed(b, owner.talentId, 'VersaTalent'));
      availability = days;
    } else {
      const scope = await getBookingScope(owner);
      [bookings, availability] = await Promise.all([listBookings(scope, false, range), listAvailability(scope, range)]);
    }

    const body = buildCalendar(
      owner.kind === 'talent' ? 'My VersaTalent bookings' : `VersaTalent bookings (${owner.name})`,
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
