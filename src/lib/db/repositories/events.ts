import { sql, query } from '../client';
import { cache, CACHE_TTL } from '@/lib/utils/cache';
import type { Event, CreateEventRequest, UpdateEventRequest, EventType, EventStatus } from '../types';

// Cache keys
const EVENT_CACHE_KEYS = {
  UPCOMING: 'events:upcoming',
  FEATURED: 'events:featured',
  ALL: 'events:all',
  byId: (id: string) => `events:id:${id}`,
};

// Invalidate all event caches (call after create/update/delete)
export function invalidateEventCache(): void {
  cache.invalidatePrefix('events:');
}

// Helper function to map database row to Event with frontend-compatible fields
function mapRowToEvent(row: any): any {
  return {
    // Database fields
    id: row.id,
    title: row.title,
    slug: row.slug,
    description: row.description,
    type: row.type,
    status: row.status,
    start_time: row.start_time,
    end_time: row.end_time,
    display_time: row.display_time,
    venue: row.venue,
    image_url: row.image_url,
    featured: row.featured || false,
    tickets_url: row.tickets_url,
    price: row.price,
    tags: row.tags || [],
    organizer: row.organizer,
    expected_attendance: row.expected_attendance,
    talent_ids: row.talent_ids || [],
    is_published: row.is_published,
    created_at: row.created_at,
    updated_at: row.updated_at,
    // Frontend compatibility fields (camelCase)
    date: row.start_time, // Map start_time to date for frontend
    time: row.display_time, // Map display_time to time for frontend
    imageSrc: row.image_url, // Map image_url to imageSrc for frontend
    talentIds: row.talent_ids || [], // Map talent_ids to talentIds for frontend
    ticketsUrl: row.tickets_url, // Map tickets_url to ticketsUrl for frontend
    expectedAttendance: row.expected_attendance, // Map to camelCase for frontend
  };
}

/**
 * Get all events with optional filters
 */
export async function getAllEvents(options?: {
  status?: 'upcoming' | 'past' | 'all';
  type?: EventType;
  talentId?: string;
  publishedOnly?: boolean;
}): Promise<Event[]> {
  const { status = 'all', type, talentId, publishedOnly = true } = options || {};

  let query = sql`
    SELECT * FROM events
    WHERE 1=1
  `;

  if (publishedOnly) {
    query = sql`${query} AND is_published = TRUE`;
  }

  if (type) {
    query = sql`${query} AND type = ${type}`;
  }

  if (talentId) {
    query = sql`${query} AND ${talentId} = ANY(talent_ids)`;
  }

  // Filter by upcoming/past based on current time
  if (status === 'upcoming') {
    query = sql`${query} AND (end_time >= NOW() OR (end_time IS NULL AND start_time >= NOW()))`;
  } else if (status === 'past') {
    // Include events where end_time is in the past, OR where there's no end_time and start_time is in the past
    query = sql`${query} AND (end_time < NOW() OR (end_time IS NULL AND start_time < NOW()))`;
  }

  // Order by start_time
  if (status === 'upcoming') {
    query = sql`${query} ORDER BY start_time ASC`;
  } else if (status === 'past') {
    query = sql`${query} ORDER BY start_time DESC`;
  } else {
    query = sql`${query} ORDER BY start_time DESC`;
  }

  const events = await query;
  return events.map(mapRowToEvent);
}

/**
 * Get upcoming events only - with caching
 */
export async function getUpcomingEvents(limit?: number): Promise<Event[]> {
  // Only cache when no limit (homepage use case)
  const cacheKey = limit ? null : EVENT_CACHE_KEYS.UPCOMING;

  if (cacheKey) {
    const cached = cache.get<Event[]>(cacheKey);
    if (cached) {
      return cached;
    }
  }

  const events = await sql<Event[]>`
    SELECT * FROM events
    WHERE is_published = TRUE
    AND (end_time >= NOW() OR (end_time IS NULL AND start_time >= NOW()))
    ORDER BY start_time ASC
    ${limit ? sql`LIMIT ${limit}` : sql``}
  `;
  const mappedEvents = events.map(mapRowToEvent);

  // Cache for 2 minutes (events don't change frequently)
  if (cacheKey) {
    cache.set(cacheKey, mappedEvents, CACHE_TTL.MEDIUM * 2);
  }

  return mappedEvents;
}

/**
 * Get past events only
 */
export async function getPastEvents(limit?: number): Promise<Event[]> {
  const events = await sql<Event[]>`
    SELECT * FROM events
    WHERE is_published = TRUE
    AND (end_time < NOW() OR (end_time IS NULL AND start_time < NOW()))
    ORDER BY start_time DESC
    ${limit ? sql`LIMIT ${limit}` : sql``}
  `;
  return events.map(mapRowToEvent);
}

/**
 * Get featured events
 */
export async function getFeaturedEvents(): Promise<Event[]> {
  const events = await sql<Event[]>`
    SELECT * FROM events
    WHERE is_published = TRUE AND featured = TRUE
    ORDER BY start_time ASC
  `;
  return events.map(mapRowToEvent);
}

/**
 * Get event by ID
 */
export async function getEventById(id: string): Promise<Event | null> {
  const events = await sql<Event[]>`
    SELECT * FROM events
    WHERE id = ${id}
    LIMIT 1
  `;
  return events[0] ? mapRowToEvent(events[0]) : null;
}

/**
 * Get event by slug
 */
export async function getEventBySlug(slug: string): Promise<Event | null> {
  const events = await sql<Event[]>`
    SELECT * FROM events
    WHERE slug = ${slug}
    LIMIT 1
  `;
  return events[0] ? mapRowToEvent(events[0]) : null;
}

/**
 * Get event by ID or slug
 */
export async function getEvent(idOrSlug: string): Promise<Event | null> {
  try {
    const events = await sql<Event[]>`
      SELECT * FROM events
      WHERE id = ${idOrSlug} OR slug = ${idOrSlug}
      LIMIT 1
    `;
    return events[0] ? mapRowToEvent(events[0]) : null;
  } catch (error: any) {
    // Handle invalid UUID format - try by slug only
    if (error.code === '22P02') {
      // Invalid UUID, try slug-only search
      const events = await sql<Event[]>`
        SELECT * FROM events
        WHERE slug = ${idOrSlug}
        LIMIT 1
      `;
      return events[0] ? mapRowToEvent(events[0]) : null;
    }
    throw error;
  }
}

/**
 * Create a new event
 */
export async function createEvent(data: CreateEventRequest): Promise<Event> {
  const events = await sql<Event[]>`
    INSERT INTO events (
      title,
      slug,
      description,
      type,
      status,
      start_time,
      end_time,
      display_time,
      venue,
      image_url,
      featured,
      tickets_url,
      price,
      tags,
      organizer,
      expected_attendance,
      talent_ids,
      is_published
    )
    VALUES (
      ${data.title},
      ${data.slug || null},
      ${data.description},
      ${data.type},
      ${data.status || 'upcoming'},
      ${data.start_time},
      ${data.end_time || null},
      ${data.display_time || null},
      ${JSON.stringify(data.venue)},
      ${data.image_url || null},
      ${data.featured !== undefined ? data.featured : false},
      ${data.tickets_url || null},
      ${data.price ? JSON.stringify(data.price) : null},
      ${data.tags || []},
      ${data.organizer || null},
      ${data.expected_attendance || null},
      ${data.talent_ids || []},
      ${data.is_published !== undefined ? data.is_published : true}
    )
    RETURNING *
  `;
  return mapRowToEvent(events[0]);
}

/**
 * Update an event
 */
export async function updateEvent(
  idOrSlug: string,
  data: UpdateEventRequest
): Promise<Event> {
  const updates: string[] = [];
  const values: any[] = [];
  let paramIndex = 1;

  if (data.title !== undefined) {
    updates.push(`title = $${paramIndex++}`);
    values.push(data.title);
  }
  if (data.slug !== undefined) {
    updates.push(`slug = $${paramIndex++}`);
    values.push(data.slug);
  }
  if (data.description !== undefined) {
    updates.push(`description = $${paramIndex++}`);
    values.push(data.description);
  }
  if (data.type !== undefined) {
    updates.push(`type = $${paramIndex++}`);
    values.push(data.type);
  }
  if (data.status !== undefined) {
    updates.push(`status = $${paramIndex++}`);
    values.push(data.status);
  }
  if (data.start_time !== undefined) {
    updates.push(`start_time = $${paramIndex++}`);
    values.push(data.start_time);
  }
  if (data.end_time !== undefined) {
    updates.push(`end_time = $${paramIndex++}`);
    values.push(data.end_time);
  }
  if (data.display_time !== undefined) {
    updates.push(`display_time = $${paramIndex++}`);
    values.push(data.display_time);
  }
  if (data.venue !== undefined) {
    updates.push(`venue = $${paramIndex++}`);
    values.push(JSON.stringify(data.venue));
  }
  if (data.image_url !== undefined) {
    updates.push(`image_url = $${paramIndex++}`);
    values.push(data.image_url);
  }
  if (data.featured !== undefined) {
    updates.push(`featured = $${paramIndex++}`);
    values.push(data.featured);
  }
  if (data.tickets_url !== undefined) {
    updates.push(`tickets_url = $${paramIndex++}`);
    values.push(data.tickets_url);
  }
  if (data.price !== undefined) {
    updates.push(`price = $${paramIndex++}`);
    values.push(data.price ? JSON.stringify(data.price) : null);
  }
  if (data.tags !== undefined) {
    updates.push(`tags = $${paramIndex++}`);
    values.push(data.tags);
  }
  if (data.organizer !== undefined) {
    updates.push(`organizer = $${paramIndex++}`);
    values.push(data.organizer);
  }
  if (data.expected_attendance !== undefined) {
    updates.push(`expected_attendance = $${paramIndex++}`);
    values.push(data.expected_attendance);
  }
  if (data.talent_ids !== undefined) {
    updates.push(`talent_ids = $${paramIndex++}`);
    values.push(data.talent_ids);
  }
  if (data.is_published !== undefined) {
    updates.push(`is_published = $${paramIndex++}`);
    values.push(data.is_published);
  }

  if (updates.length === 0) {
    throw new Error('No fields to update');
  }

  updates.push(`updated_at = CURRENT_TIMESTAMP`);

  values.push(idOrSlug);
  values.push(idOrSlug);

  const queryText = `
    UPDATE events
    SET ${updates.join(', ')}
    WHERE id = $${paramIndex++} OR slug = $${paramIndex}
    RETURNING *
  `;

  const result = await query(queryText, values);

  if (result.length === 0) {
    throw new Error('Event not found');
  }

  return mapRowToEvent(result[0]);
}

/**
 * Delete an event
 */
export async function deleteEvent(idOrSlug: string): Promise<boolean> {
  const result = await sql`
    DELETE FROM events
    WHERE id = ${idOrSlug} OR slug = ${idOrSlug}
  `;
  return result.count > 0;
}

/**
 * Get events count by status
 */
export async function getEventsCountByStatus(): Promise<{
  upcoming: number;
  past: number;
  total: number;
}> {
  const result = await sql<{ upcoming: string; past: string; total: string }[]>`
    SELECT
      COUNT(*) FILTER (WHERE end_time >= NOW() OR (end_time IS NULL AND start_time >= NOW())) as upcoming,
      COUNT(*) FILTER (WHERE end_time < NOW()) as past,
      COUNT(*) as total
    FROM events
    WHERE is_published = TRUE
  `;

  return {
    upcoming: parseInt(result[0].upcoming),
    past: parseInt(result[0].past),
    total: parseInt(result[0].total)
  };
}

/**
 * Search events by title or description
 */
export async function searchEvents(queryStr: string): Promise<Event[]> {
  const events = await sql<Event[]>`
    SELECT * FROM events
    WHERE is_published = TRUE
    AND (
      title ILIKE ${`%${queryStr}%`}
      OR description ILIKE ${`%${queryStr}%`}
      OR organizer ILIKE ${`%${queryStr}%`}
    )
    ORDER BY start_time DESC
  `;
  return events.map(mapRowToEvent);
}
