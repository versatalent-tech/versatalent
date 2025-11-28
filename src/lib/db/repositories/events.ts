import { sql } from '../client';
import type { NFCEvent, CreateEventRequest, UpdateEventRequest } from '../types';

export async function getAllEvents(): Promise<NFCEvent[]> {
  const events = await sql<NFCEvent[]>`
    SELECT * FROM nfc_events
    ORDER BY date DESC
  `;
  return events;
}

export async function getActiveEvents(): Promise<NFCEvent[]> {
  const events = await sql<NFCEvent[]>`
    SELECT * FROM nfc_events
    WHERE is_active = true
    ORDER BY date DESC
  `;
  return events;
}

export async function getEventById(id: string): Promise<NFCEvent | null> {
  const events = await sql<NFCEvent[]>`
    SELECT * FROM nfc_events WHERE id = ${id} LIMIT 1
  `;
  return events[0] || null;
}

export async function getUpcomingEvents(): Promise<NFCEvent[]> {
  const events = await sql<NFCEvent[]>`
    SELECT * FROM nfc_events
    WHERE date >= NOW() AND is_active = true
    ORDER BY date ASC
  `;
  return events;
}

export async function getPastEvents(): Promise<NFCEvent[]> {
  const events = await sql<NFCEvent[]>`
    SELECT * FROM nfc_events
    WHERE date < NOW()
    ORDER BY date DESC
  `;
  return events;
}

export async function createEvent(data: CreateEventRequest): Promise<NFCEvent> {
  const events = await sql<NFCEvent[]>`
    INSERT INTO nfc_events (name, date, location, description, metadata)
    VALUES (
      ${data.name},
      ${data.date},
      ${data.location || null},
      ${data.description || null},
      ${JSON.stringify(data.metadata || {})}
    )
    RETURNING *
  `;
  return events[0];
}

export async function updateEvent(id: string, data: UpdateEventRequest): Promise<NFCEvent> {
  const updates: string[] = [];
  const values: any[] = [];
  let paramIndex = 1;

  if (data.name !== undefined) {
    updates.push(`name = $${paramIndex++}`);
    values.push(data.name);
  }
  if (data.date !== undefined) {
    updates.push(`date = $${paramIndex++}`);
    values.push(data.date);
  }
  if (data.location !== undefined) {
    updates.push(`location = $${paramIndex++}`);
    values.push(data.location);
  }
  if (data.description !== undefined) {
    updates.push(`description = $${paramIndex++}`);
    values.push(data.description);
  }
  if (data.is_active !== undefined) {
    updates.push(`is_active = $${paramIndex++}`);
    values.push(data.is_active);
  }
  if (data.metadata !== undefined) {
    updates.push(`metadata = $${paramIndex++}`);
    values.push(JSON.stringify(data.metadata));
  }

  if (updates.length === 0) {
    throw new Error('No fields to update');
  }

  values.push(id);
  const query = `
    UPDATE nfc_events
    SET ${updates.join(', ')}
    WHERE id = $${paramIndex}
    RETURNING *
  `;

  const events = await sql<NFCEvent[]>(query, values);
  return events[0];
}

export async function deleteEvent(id: string): Promise<boolean> {
  const result = await sql`
    DELETE FROM nfc_events WHERE id = ${id}
  `;
  return result.length > 0;
}
