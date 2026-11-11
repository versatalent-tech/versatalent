import { NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/middleware/auth';
import { getEventDayEvent } from '@/lib/db/repositories/event-day';
import type { DoorActor } from '@/lib/db/repositories/door-tickets';

/**
 * For the door's ticket routes: a staff or admin session (as for card
 * check-in), and an event whose check-ins are switched on.
 */
export async function doorContext(eventId: string): Promise<{ actor: DoorActor } | { response: Response }> {
  const session = await getCurrentSession();
  if (!session) {
    return { response: NextResponse.json({ success: false, error: 'Staff authentication required' }, { status: 401 }) };
  }
  const event = await getEventDayEvent(eventId);
  if (!event || !event.checkins_enabled) {
    return { response: NextResponse.json({ success: false, error: 'Check-ins are not enabled for this event' }, { status: 409 }) };
  }
  return { actor: { userId: session.userId ?? null, name: session.name ?? null } };
}
