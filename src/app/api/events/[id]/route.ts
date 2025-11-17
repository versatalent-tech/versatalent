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
    const { events } = await import('@/lib/data/events');
    await writeEvents(events);
    return events;
  }
}

// Helper to write events to file
async function writeEvents(events: EventItem[]): Promise<void> {
  await fs.writeFile(DATA_FILE, JSON.stringify(events, null, 2), 'utf-8');
}

// GET single event by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const events = await readEvents();
    const event = events.find(e => e.id === id);

    if (!event) {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(event);
  } catch (error) {
    console.error('Error fetching event:', error);
    return NextResponse.json(
      { error: 'Failed to fetch event' },
      { status: 500 }
    );
  }
}

// PUT - Update event
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const updatedEvent: EventItem = await request.json();
    const events = await readEvents();

    const index = events.findIndex(e => e.id === id);

    if (index === -1) {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      );
    }

    // Preserve the ID
    updatedEvent.id = id;
    events[index] = updatedEvent;

    await writeEvents(events);

    return NextResponse.json(updatedEvent);
  } catch (error) {
    console.error('Error updating event:', error);
    return NextResponse.json(
      { error: 'Failed to update event' },
      { status: 500 }
    );
  }
}

// DELETE event
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const events = await readEvents();
    const filteredEvents = events.filter(e => e.id !== id);

    if (events.length === filteredEvents.length) {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      );
    }

    await writeEvents(filteredEvents);

    return NextResponse.json({ success: true, message: 'Event deleted successfully' });
  } catch (error) {
    console.error('Error deleting event:', error);
    return NextResponse.json(
      { error: 'Failed to delete event' },
      { status: 500 }
    );
  }
}
