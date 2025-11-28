import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import type { EventItem } from '@/lib/data/events';

const DATA_FILE = path.join(process.cwd(), 'src', 'lib', 'data', 'events-data.json');

// Helper to read events from file
async function readEvents(): Promise<EventItem[]> {
  try {
    const fileContent = await fs.readFile(DATA_FILE, 'utf-8');
    return JSON.parse(fileContent);
  } catch (error) {
    // If file doesn't exist, import from static data
    const { events } = await import('@/lib/data/events');
    await writeEvents(events);
    return events;
  }
}

// Helper to write events to file
async function writeEvents(events: EventItem[]): Promise<void> {
  await fs.writeFile(DATA_FILE, JSON.stringify(events, null, 2), 'utf-8');
}

// GET all events
export async function GET(request: NextRequest) {
  try {
    const events = await readEvents();

    // Add cache headers for better performance
    const headers = {
      'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=30',
    };

    // Optional: Filter by query params
    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get('type');
    const status = searchParams.get('status');
    const talentId = searchParams.get('talentId');

    let filteredEvents = events;

    if (type) {
      filteredEvents = filteredEvents.filter(e => e.type === type);
    }

    if (status) {
      filteredEvents = filteredEvents.filter(e => e.status === status);
    }

    if (talentId) {
      filteredEvents = filteredEvents.filter(e => e.talentIds.includes(talentId));
    }

    return NextResponse.json(filteredEvents, { headers });
  } catch (error) {
    console.error('Error fetching events:', error);
    return NextResponse.json(
      { error: 'Failed to fetch events' },
      { status: 500 }
    );
  }
}

// POST - Create new event
export async function POST(request: NextRequest) {
  try {
    const newEvent: EventItem = await request.json();

    // Validate required fields
    if (!newEvent.title || !newEvent.date || !newEvent.type) {
      return NextResponse.json(
        { error: 'Missing required fields: title, date, type' },
        { status: 400 }
      );
    }

    const events = await readEvents();

    // Generate new ID
    const maxId = events.reduce((max, e) => {
      const id = parseInt(e.id);
      return id > max ? id : max;
    }, 0);

    newEvent.id = (maxId + 1).toString();

    events.push(newEvent);
    await writeEvents(events);

    return NextResponse.json(newEvent, { status: 201 });
  } catch (error) {
    console.error('Error creating event:', error);
    return NextResponse.json(
      { error: 'Failed to create event' },
      { status: 500 }
    );
  }
}
