import { NextRequest, NextResponse } from 'next/server';
import {
  getAllEvents,
  getUpcomingEvents,
  getPastEvents,
  createEvent,
  searchEvents
} from '@/lib/db/repositories/events';
import type { CreateEventRequest, EventType } from '@/lib/db/types';
import { withAdminAuth } from '@/lib/middleware/auth';

// GET all events with optional filters
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status') as 'upcoming' | 'past' | 'all' | null;
    const type = searchParams.get('type') as EventType | null;
    const talentId = searchParams.get('talentId');
    const searchQuery = searchParams.get('q');

    // Add cache headers for better performance
    const headers = {
      'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=30',
    };

    // Handle search query
    if (searchQuery) {
      const events = await searchEvents(searchQuery);
      return NextResponse.json(events, { headers });
    }

    // Handle specific status requests
    if (status === 'upcoming') {
      const events = await getUpcomingEvents();
      return NextResponse.json(events, { headers });
    }

    if (status === 'past') {
      const events = await getPastEvents();
      return NextResponse.json(events, { headers });
    }

    // Get all events with optional filters
    const events = await getAllEvents({
      status: status || 'all',
      type: type || undefined,
      talentId: talentId || undefined,
      publishedOnly: true
    });

    return NextResponse.json(events, { headers });
  } catch (error) {
    console.error('Error fetching events:', error);
    return NextResponse.json(
      { error: 'Failed to fetch events' },
      { status: 500 }
    );
  }
}

// POST - Create new event (admin only)
export const POST = withAdminAuth(async (request: Request) => {
  try {
    const data: CreateEventRequest = await request.json();

    // Validate required fields
    if (!data.title || !data.description || !data.type || !data.start_time || !data.venue) {
      return NextResponse.json(
        { error: 'Missing required fields: title, description, type, start_time, venue' },
        { status: 400 }
      );
    }

    // Validate event type
    const validTypes = ['performance', 'photoshoot', 'match', 'collaboration', 'workshop', 'appearance'];
    if (!validTypes.includes(data.type)) {
      return NextResponse.json(
        { error: 'Invalid event type' },
        { status: 400 }
      );
    }

    const event = await createEvent(data);

    return NextResponse.json(event, { status: 201 });
  } catch (error: any) {
    console.error('Error creating event:', error);
    return NextResponse.json(
      { error: 'Failed to create event', details: error.message },
      { status: 500 }
    );
  }
});
