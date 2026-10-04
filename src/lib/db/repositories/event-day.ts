import { sql } from '../client';

/**
 * Event-day (door check-in) queries.
 *
 * The door page is opened for a public event (events table); check-ins are
 * recorded against its linked nfc_events row, which is created when an admin
 * enables check-ins for the event.
 */

export interface EventDayEvent {
  id: string;
  title: string;
  start_time: string;
  end_time: string | null;
  display_time: string | null;
  venue: { name?: string; city?: string } | null;
  image_url: string | null;
  nfc_event_id: string;
  checkins_enabled: boolean;
  /** The event is on today's UK date, so check-in points are keyed to the event */
  is_today: boolean;
  total_checkins: number;
  unique_attendees: number;
  members_rewarded: number;
}

export interface EventDayCheckin {
  id: string;
  user_id: string;
  user_name: string | null;
  user_role: string | null;
  timestamp: string;
  points_awarded: number;
}

// A function, not a constant: building the query at import time would fail
// the build when DATABASE_URL is unset
const eventDaySelect = () => sql`
  SELECT
    e.id,
    e.title,
    e.start_time,
    e.end_time,
    e.display_time,
    e.venue,
    e.image_url,
    ne.id AS nfc_event_id,
    COALESCE(ne.is_active, FALSE) AS checkins_enabled,
    (ne.date AT TIME ZONE 'Europe/London')::date = (NOW() AT TIME ZONE 'Europe/London')::date AS is_today,
    (SELECT COUNT(*) FROM checkins c WHERE c.event_id = ne.id)::int AS total_checkins,
    (SELECT COUNT(DISTINCT c.user_id) FROM checkins c WHERE c.event_id = ne.id)::int AS unique_attendees,
    (SELECT COUNT(*) FROM vip_checkin_awards a WHERE a.award_key = 'event:' || ne.id)::int AS members_rewarded
  FROM events e
  JOIN nfc_events ne ON ne.event_id = e.id
`;

/**
 * Events with check-ins enabled that are on today or later (plus yesterday,
 * so a late-running night is still listed after midnight), soonest first.
 */
export async function getEventDayEvents(): Promise<EventDayEvent[]> {
  return sql<EventDayEvent[]>`
    ${eventDaySelect()}
    WHERE ne.is_active = TRUE
      AND (e.start_time AT TIME ZONE 'Europe/London')::date >= (NOW() AT TIME ZONE 'Europe/London')::date - 1
    ORDER BY e.start_time ASC
  `;
}

/** A single event for the door page, or null if it has never had check-ins enabled */
export async function getEventDayEvent(eventId: string): Promise<EventDayEvent | null> {
  const rows = await sql<EventDayEvent[]>`
    ${eventDaySelect()}
    WHERE e.id = ${eventId}
    LIMIT 1
  `;
  return rows[0] || null;
}

/** Latest check-ins at the event, with the points each one earned */
export async function getEventDayCheckins(nfcEventId: string, limit = 50): Promise<EventDayCheckin[]> {
  return sql<EventDayCheckin[]>`
    SELECT
      c.id,
      c.user_id,
      u.name AS user_name,
      u.role AS user_role,
      c.timestamp,
      COALESCE((
        SELECT SUM(l.delta_points)
        FROM vip_points_log l
        WHERE l.ref_id = c.id AND l.source = 'event_checkin'
      ), 0)::int AS points_awarded
    FROM checkins c
    LEFT JOIN users u ON u.id = c.user_id
    WHERE c.event_id = ${nfcEventId}
    ORDER BY c.timestamp DESC
    LIMIT ${limit}
  `;
}

/** The member's first check-in at this event, if they already checked in */
export async function findEventCheckin(nfcEventId: string, userId: string): Promise<{ id: string; timestamp: string } | null> {
  const rows = await sql<{ id: string; timestamp: string }[]>`
    SELECT id, timestamp
    FROM checkins
    WHERE event_id = ${nfcEventId} AND user_id = ${userId}
    ORDER BY timestamp ASC
    LIMIT 1
  `;
  return rows[0] || null;
}
