import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db/client';
import { getEvent } from '@/lib/db/repositories/events';

// GET check-in stats for an event
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Get event to verify it exists
    const event = await getEvent(id);
    if (!event) {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      );
    }

    // Get check-in stats from the integration view
    const stats = await sql`
      SELECT 
        nfc_event_id,
        checkins_enabled,
        total_checkins,
        unique_attendees
      FROM events_with_checkins
      WHERE id = ${id}
      LIMIT 1
    `;

    if (stats.length === 0) {
      return NextResponse.json({
        event_id: id,
        nfc_event_id: null,
        checkins_enabled: false,
        total_checkins: 0,
        unique_attendees: 0
      });
    }

    return NextResponse.json({
      event_id: id,
      ...stats[0]
    });
  } catch (error) {
    console.error('Error fetching check-in stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch check-in stats' },
      { status: 500 }
    );
  }
}

// POST enable check-ins for an event
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Get event to verify it exists
    const event = await getEvent(id);
    if (!event) {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      );
    }

    // Check if NFC event already exists
    const existing = await sql`
      SELECT id FROM nfc_events
      WHERE event_id = ${id}
      LIMIT 1
    `;

    if (existing.length > 0) {
      // Already has NFC event, just activate it
      await sql`
        UPDATE nfc_events
        SET is_active = TRUE
        WHERE event_id = ${id}
      `;

      return NextResponse.json({
        message: 'Check-ins enabled',
        nfc_event_id: existing[0].id,
        already_existed: true
      });
    }

    // Create new NFC event using helper function
    const result = await sql`
      SELECT create_nfc_event_from_event(${id}::uuid, TRUE) as nfc_event_id
    `;

    return NextResponse.json({
      message: 'Check-ins enabled',
      nfc_event_id: result[0].nfc_event_id,
      already_existed: false
    }, { status: 201 });
  } catch (error: any) {
    console.error('Error enabling check-ins:', error);
    return NextResponse.json(
      { error: 'Failed to enable check-ins', details: error.message },
      { status: 500 }
    );
  }
}

// DELETE disable check-ins for an event
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Get event to verify it exists
    const event = await getEvent(id);
    if (!event) {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      );
    }

    // Disable NFC event (don't delete, preserve check-in history)
    const result = await sql`
      UPDATE nfc_events
      SET is_active = FALSE
      WHERE event_id = ${id}
      RETURNING id
    `;

    if (result.length === 0) {
      return NextResponse.json(
        { error: 'No check-ins were enabled for this event' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: 'Check-ins disabled',
      nfc_event_id: result[0].id
    });
  } catch (error: any) {
    console.error('Error disabling check-ins:', error);
    return NextResponse.json(
      { error: 'Failed to disable check-ins', details: error.message },
      { status: 500 }
    );
  }
}
