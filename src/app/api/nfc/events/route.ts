import { NextRequest, NextResponse } from 'next/server';
import { getAllEvents, createEvent, getUpcomingEvents } from '@/lib/db/repositories/events';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const filter = searchParams.get('filter');

    let events;
    if (filter === 'active' || filter === 'upcoming') {
      // Use getUpcomingEvents for both 'active' and 'upcoming' filters
      events = await getUpcomingEvents();
    } else {
      events = await getAllEvents();
    }

    return NextResponse.json(events);
  } catch (error) {
    console.error('Error fetching events:', error);
    return NextResponse.json(
      { error: 'Failed to fetch events' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();

    if (!data.name || !data.date) {
      return NextResponse.json(
        { error: 'Missing required fields: name, date' },
        { status: 400 }
      );
    }

    const event = await createEvent(data);
    return NextResponse.json(event, { status: 201 });
  } catch (error) {
    console.error('Error creating event:', error);
    return NextResponse.json(
      { error: 'Failed to create event' },
      { status: 500 }
    );
  }
}
