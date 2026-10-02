import { NextResponse } from 'next/server';
import { requireStaff } from '@/lib/middleware/auth';
import { getEventDayEvents } from '@/lib/db/repositories/event-day';

/**
 * Events staff can open the door check-in page for
 * GET /api/staff/event-day
 */
export async function GET() {
  const denied = await requireStaff();
  if (denied) return denied;

  try {
    return NextResponse.json(await getEventDayEvents());
  } catch (error) {
    console.error('Error fetching event-day events:', error);
    return NextResponse.json({ error: 'Failed to fetch events' }, { status: 500 });
  }
}
