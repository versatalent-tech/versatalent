import { NextRequest, NextResponse } from 'next/server';
import { requireStaff } from '@/lib/middleware/auth';
import { getEventDayEvent, getEventDayCheckins } from '@/lib/db/repositories/event-day';

/**
 * Event details, counters and latest check-ins for the door page
 * GET /api/staff/event-day/:eventId
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const denied = await requireStaff();
  if (denied) return denied;

  try {
    const { eventId } = await params;
    const event = await getEventDayEvent(eventId);

    if (!event) {
      return NextResponse.json(
        { error: 'Check-ins have not been enabled for this event' },
        { status: 404 }
      );
    }

    const checkins = await getEventDayCheckins(event.nfc_event_id);
    return NextResponse.json({ event, checkins });
  } catch (error) {
    console.error('Error fetching event day:', error);
    return NextResponse.json({ error: 'Failed to load event' }, { status: 500 });
  }
}
