import { createHash, randomBytes } from 'crypto';
import type { z } from 'zod';
import { sql } from '../client';
import { getTalentScope } from './team';
import type { TeamRole } from '@/lib/auth/permissions';
import type { availabilitySchema, bookingSchema, bookingUpdateSchema } from '@/lib/bookings/schemas';
import {
  ACTIVE_BOOKING_STATUSES,
  AGENCY_TIME_ZONE,
  BOOKING_STATUSES,
  commissionCents,
  netCents,
  type Availability,
  type Booking,
  type BookingStatus,
  type Clash,
  type PublicEventBlock,
  type TalentRate,
} from '@/lib/bookings/types';

/**
 * Bookings, availability and the calendar feed.
 *
 * Every query is limited to the talents the person may see (admins: all;
 * managers and road managers: their assigned talents). Money is only
 * included when the caller passes `withMoney` (the bookings.fees permission).
 */

export interface BookingScope {
  all: boolean;
  talentIds: string[];
}

export interface BookingActor {
  userId: string | null;
  name: string | null;
}

export async function getBookingScope(session: { userId?: string; role: TeamRole }): Promise<BookingScope> {
  const scope = await getTalentScope(session);
  return scope === 'all' ? { all: true, talentIds: [] } : { all: false, talentIds: scope };
}

export function canSeeTalent(scope: BookingScope, talentId: string): boolean {
  return scope.all || scope.talentIds.includes(talentId);
}

function talentVisible(scope: BookingScope, column: 'b.talent_id' | 'a.talent_id') {
  if (scope.all) return sql`TRUE`;
  return sql`${sql.unsafe(column)} = ANY(${scope.talentIds}::uuid[])`;
}

function iso(value: unknown): string {
  return value instanceof Date ? value.toISOString() : String(value);
}

function dateOnly(value: unknown): string {
  if (value instanceof Date) {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`;
  }
  return String(value).slice(0, 10);
}

const ref = (id: unknown, name: unknown) => (id ? { id: String(id), name: String(name ?? '') } : null);

const bookingSelect = () => sql`
  SELECT b.*, t.name AS talent_name, d.title AS deal_title, o.name AS client_name, e.title AS event_title
  FROM bookings b
  JOIN talents t ON t.id = b.talent_id
  LEFT JOIN deals d ON d.id = b.deal_id
  LEFT JOIN organisations o ON o.id = b.organisation_id
  LEFT JOIN events e ON e.id = b.event_id
`;

export function mapBooking(row: any, withMoney: boolean): Booking {
  const fee = row.fee_cents === null ? null : Number(row.fee_cents);
  const pct = row.commission_percent === null ? null : Number(row.commission_percent);
  return {
    id: row.id,
    title: row.title,
    status: row.status,
    starts_at: iso(row.starts_at),
    ends_at: iso(row.ends_at),
    location: row.location,
    call_time: row.call_time,
    brief: row.brief,
    logistics_notes: row.logistics_notes,
    onsite_contact: row.onsite_contact ?? {},
    talent: { id: row.talent_id, name: row.talent_name },
    deal: ref(row.deal_id, row.deal_title),
    client: ref(row.organisation_id, row.client_name),
    event: ref(row.event_id, row.event_title),
    client_visible_to_talent: row.client_visible_to_talent,
    shared_with_talent: row.shared_with_talent,
    talent_response: row.talent_response,
    ...(withMoney
      ? {
          money: {
            fee_cents: fee,
            currency: row.currency,
            commission_percent: pct,
            commission_cents: commissionCents(fee, pct),
            net_cents: netCents(fee, pct),
            paid_at: row.talent_paid_at ? iso(row.talent_paid_at) : null,
            paid_cents: row.talent_paid_cents === null || row.talent_paid_cents === undefined ? null : Number(row.talent_paid_cents),
            paid_reference: row.talent_paid_reference ?? null,
          },
        }
      : {}),
    created_at: iso(row.created_at),
    updated_at: iso(row.updated_at),
  };
}

// ---------------------------------------------------------------------------
// Bookings
// ---------------------------------------------------------------------------

export async function listBookings(
  scope: BookingScope,
  withMoney: boolean,
  filters: { from: string; to: string; talentId?: string; dealId?: string }
): Promise<Booking[]> {
  const rows = await sql`
    ${bookingSelect()}
    WHERE ${talentVisible(scope, 'b.talent_id')}
      AND b.starts_at < ${filters.to} AND b.ends_at > ${filters.from}
      AND (${filters.talentId ?? null}::uuid IS NULL OR b.talent_id = ${filters.talentId ?? null})
      AND (${filters.dealId ?? null}::uuid IS NULL OR b.deal_id = ${filters.dealId ?? null})
    ORDER BY b.starts_at
    LIMIT 2000
  `;
  return rows.map((row: any) => mapBooking(row, withMoney));
}

export async function listBookingsForDeal(scope: BookingScope, withMoney: boolean, dealId: string): Promise<Booking[]> {
  const rows = await sql`
    ${bookingSelect()}
    WHERE b.deal_id = ${dealId} AND ${talentVisible(scope, 'b.talent_id')}
    ORDER BY b.starts_at
  `;
  return rows.map((row: any) => mapBooking(row, withMoney));
}

export async function getBooking(scope: BookingScope, withMoney: boolean, id: string): Promise<Booking | null> {
  const rows = await sql`${bookingSelect()} WHERE b.id = ${id} AND ${talentVisible(scope, 'b.talent_id')} LIMIT 1`;
  return rows[0] ? mapBooking(rows[0], withMoney) : null;
}

/** Upcoming hold/confirmed bookings, soonest first (dashboard) */
export async function listUpcomingBookings(scope: BookingScope, limit = 6): Promise<Booking[]> {
  const rows = await sql`
    ${bookingSelect()}
    WHERE ${talentVisible(scope, 'b.talent_id')}
      AND b.ends_at > NOW() AND b.status = ANY(${ACTIVE_BOOKING_STATUSES}::text[])
    ORDER BY b.starts_at
    LIMIT ${limit}
  `;
  return rows.map((row: any) => mapBooking(row, false));
}

export async function countHoldsStartingSoon(scope: BookingScope, days = 14): Promise<number> {
  const rows = await sql`
    SELECT COUNT(*) AS n FROM bookings b
    WHERE ${talentVisible(scope, 'b.talent_id')}
      AND b.status = 'hold' AND b.starts_at > NOW() AND b.starts_at < NOW() + make_interval(days => ${days})
  `;
  return Number(rows[0].n);
}

/**
 * Other bookings (on hold or confirmed) and unavailable days that overlap
 * this time for the same talent. Unavailable days are compared as UK dates.
 */
export async function findClashes(
  talentId: string,
  startsAt: string,
  endsAt: string,
  excludeBookingId?: string
): Promise<Clash[]> {
  const [bookingRows, availabilityRows] = await Promise.all([
    sql`
      SELECT b.id, b.title, b.starts_at, t.name AS talent_name
      FROM bookings b JOIN talents t ON t.id = b.talent_id
      WHERE b.talent_id = ${talentId}
        AND b.status = ANY(${ACTIVE_BOOKING_STATUSES}::text[])
        AND b.starts_at < ${endsAt} AND b.ends_at > ${startsAt}
        AND (${excludeBookingId ?? null}::uuid IS NULL OR b.id <> ${excludeBookingId ?? null})
    `,
    sql`
      SELECT a.id, a.kind, a.starts_on, a.ends_on, a.note, t.name AS talent_name
      FROM talent_availability a JOIN talents t ON t.id = a.talent_id
      WHERE a.talent_id = ${talentId}
        AND a.starts_on <= (${endsAt}::timestamptz AT TIME ZONE ${AGENCY_TIME_ZONE})::date
        AND a.ends_on >= (${startsAt}::timestamptz AT TIME ZONE ${AGENCY_TIME_ZONE})::date
    `,
  ]);

  return [
    ...bookingRows.map((row: any) => ({
      kind: 'booking' as const,
      id: row.id,
      label: `Already booked: ${row.title}`,
      talent_name: row.talent_name,
    })),
    ...availabilityRows.map((row: any) => ({
      kind: 'availability' as const,
      id: row.id,
      label: `${row.kind === 'tentative' ? 'Maybe unavailable' : 'Unavailable'} ${dateOnly(row.starts_on)} to ${dateOnly(row.ends_on)}${row.note ? ` (${row.note})` : ''}`,
      talent_name: row.talent_name,
    })),
  ];
}

type BookingInput = z.infer<typeof bookingSchema>;

export async function createBooking(actor: BookingActor, data: BookingInput): Promise<string> {
  const rows = await sql`
    INSERT INTO bookings (
      talent_id, deal_id, organisation_id, title, status, starts_at, ends_at, location, call_time, brief,
      logistics_notes, onsite_contact, fee_cents, currency, commission_percent,
      client_visible_to_talent, shared_with_talent, created_by
    ) VALUES (
      ${data.talent_id}, ${data.deal_id ?? null},
      -- the client defaults to the deal's client
      COALESCE(${data.organisation_id ?? null}::uuid, (SELECT organisation_id FROM deals WHERE id = ${data.deal_id ?? null}::uuid)),
      ${data.title}, ${data.status}, ${data.starts_at}, ${data.ends_at}, ${data.location ?? null},
      ${data.call_time ?? null}, ${data.brief ?? null}, ${data.logistics_notes ?? null},
      ${JSON.stringify(data.onsite_contact ?? {})}, ${data.fee_cents ?? null}, ${data.currency},
      -- commission is the talent's rate at the time of booking, unless set explicitly
      ${data.commission_percent === undefined
        ? sql`(SELECT commission_percent FROM talents WHERE id = ${data.talent_id})`
        : sql`${data.commission_percent}`},
      ${data.client_visible_to_talent}, ${data.shared_with_talent}, ${actor.userId}
    )
    RETURNING id, deal_id, (SELECT name FROM talents WHERE id = ${data.talent_id}) AS talent_name
  `;
  const created = rows[0];
  if (created.deal_id) {
    await logOnDeal(actor, created.deal_id, `Booking added: ${created.talent_name}, ${data.title}`);
  }
  return created.id;
}

/** Apply the given fields only; returns false when the booking isn't visible */
export async function updateBooking(
  scope: BookingScope,
  actor: BookingActor,
  id: string,
  changes: Partial<z.infer<typeof bookingUpdateSchema>>
): Promise<boolean> {
  const currentRows = await sql`SELECT * FROM bookings b WHERE b.id = ${id} AND ${talentVisible(scope, 'b.talent_id')} LIMIT 1`;
  const current = currentRows[0];
  if (!current) return false;

  const has = (key: string) => Object.prototype.hasOwnProperty.call(changes, key);
  const pick = (key: keyof typeof changes) => (has(key) ? (changes[key] ?? null) : current[key]);

  await sql`
    UPDATE bookings SET
      talent_id = ${pick('talent_id')},
      deal_id = ${pick('deal_id')},
      organisation_id = ${pick('organisation_id')},
      title = ${pick('title')},
      status = ${pick('status')},
      starts_at = ${pick('starts_at')},
      ends_at = ${pick('ends_at')},
      location = ${pick('location')},
      call_time = ${pick('call_time')},
      brief = ${pick('brief')},
      logistics_notes = ${pick('logistics_notes')},
      onsite_contact = ${JSON.stringify(has('onsite_contact') ? changes.onsite_contact ?? {} : current.onsite_contact ?? {})},
      fee_cents = ${pick('fee_cents')},
      currency = ${pick('currency')},
      commission_percent = ${pick('commission_percent')},
      client_visible_to_talent = ${pick('client_visible_to_talent')},
      shared_with_talent = ${pick('shared_with_talent')},
      updated_at = NOW()
    WHERE id = ${id}
  `;

  if (changes.status && changes.status !== current.status && current.deal_id) {
    await logOnDeal(
      actor,
      current.deal_id,
      `Booking “${current.title}”: ${BOOKING_STATUSES[current.status as BookingStatus]} → ${BOOKING_STATUSES[changes.status]}`
    );
  }
  return true;
}

export async function deleteBooking(id: string): Promise<void> {
  await sql`DELETE FROM bookings WHERE id = ${id}`;
}

async function logOnDeal(actor: BookingActor, dealId: string, subject: string): Promise<void> {
  await sql`
    INSERT INTO activities (type, subject, deal_id, organisation_id, completed_at, owner_user_id, created_by, created_by_name)
    VALUES ('system', ${subject}, ${dealId}, (SELECT organisation_id FROM deals WHERE id = ${dealId}), NOW(),
            ${actor.userId}, ${actor.userId}, ${actor.name})
  `;
}

// ---------------------------------------------------------------------------
// Availability
// ---------------------------------------------------------------------------

export async function listAvailability(
  scope: BookingScope,
  filters: { from: string; to: string; talentId?: string }
): Promise<Availability[]> {
  const rows = await sql`
    SELECT a.*, t.name AS talent_name
    FROM talent_availability a JOIN talents t ON t.id = a.talent_id
    WHERE ${talentVisible(scope, 'a.talent_id')}
      AND a.starts_on <= (${filters.to}::timestamptz AT TIME ZONE ${AGENCY_TIME_ZONE})::date
      AND a.ends_on >= (${filters.from}::timestamptz AT TIME ZONE ${AGENCY_TIME_ZONE})::date
      AND (${filters.talentId ?? null}::uuid IS NULL OR a.talent_id = ${filters.talentId ?? null})
    ORDER BY a.starts_on
  `;
  return rows.map((row: any) => ({
    id: row.id,
    talent: { id: row.talent_id, name: row.talent_name },
    starts_on: dateOnly(row.starts_on),
    ends_on: dateOnly(row.ends_on),
    kind: row.kind,
    note: row.note,
  }));
}

export async function createAvailability(actor: BookingActor, data: z.infer<typeof availabilitySchema>): Promise<string> {
  const rows = await sql`
    INSERT INTO talent_availability (talent_id, starts_on, ends_on, kind, note, created_by)
    VALUES (${data.talent_id}, ${data.starts_on}, ${data.ends_on}, ${data.kind}, ${data.note ?? null}, ${actor.userId})
    RETURNING id
  `;
  return rows[0].id;
}

export async function deleteAvailability(scope: BookingScope, id: string): Promise<boolean> {
  const rows = await sql`
    DELETE FROM talent_availability a WHERE a.id = ${id} AND ${talentVisible(scope, 'a.talent_id')} RETURNING a.id
  `;
  return rows.length > 0;
}

// ---------------------------------------------------------------------------
// Public events involving the visible talents (shown as a separate layer)
// ---------------------------------------------------------------------------

export async function listPublicEvents(scope: BookingScope, from: string, to: string): Promise<PublicEventBlock[]> {
  const rows = await sql`
    SELECT e.id, e.title, e.start_time, e.end_time,
      COALESCE((SELECT array_agg(t.name ORDER BY t.name) FROM talents t WHERE t.id::text = ANY(e.talent_ids)), '{}') AS talent_names
    FROM events e
    WHERE e.status <> 'cancelled'
      AND e.start_time < ${to} AND COALESCE(e.end_time, e.start_time) >= ${from}
      AND (${scope.all} OR e.talent_ids && ${scope.talentIds.map(String)}::text[])
    ORDER BY e.start_time
  `;
  return rows.map((row: any) => ({
    id: row.id,
    title: row.title,
    starts_at: iso(row.start_time),
    ends_at: row.end_time ? iso(row.end_time) : null,
    talent_names: row.talent_names ?? [],
  }));
}

// ---------------------------------------------------------------------------
// Commission rates (per talent)
// ---------------------------------------------------------------------------

export async function listTalentRates(): Promise<TalentRate[]> {
  const rows = await sql`SELECT id, name, is_active, commission_percent FROM talents ORDER BY is_active DESC, name`;
  return rows.map((row: any) => ({
    id: row.id,
    name: row.name,
    is_active: row.is_active,
    commission_percent: row.commission_percent === null ? null : Number(row.commission_percent),
  }));
}

export async function setTalentRates(rates: { talent_id: string; commission_percent: number | null }[]): Promise<void> {
  if (rates.length === 0) return;
  await sql.transaction(
    rates.map((r) => sql`UPDATE talents SET commission_percent = ${r.commission_percent} WHERE id = ${r.talent_id}`)
  );
}

export async function getTalentRate(talentId: string): Promise<number | null> {
  const rows = await sql`SELECT commission_percent FROM talents WHERE id = ${talentId}`;
  return rows[0]?.commission_percent == null ? null : Number(rows[0].commission_percent);
}

// ---------------------------------------------------------------------------
// Personal calendar feed (iCal subscription link)
// ---------------------------------------------------------------------------

const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');

/** Issue a new feed token for this person; any previous link stops working */
export async function issueCalendarFeed(userId: string): Promise<string> {
  const token = randomBytes(32).toString('base64url');
  await sql`
    INSERT INTO calendar_feeds (user_id, token_hash) VALUES (${userId}, ${hashToken(token)})
    ON CONFLICT (user_id) DO UPDATE SET token_hash = EXCLUDED.token_hash, created_at = NOW(), last_used_at = NULL
  `;
  return token;
}

export async function revokeCalendarFeed(userId: string): Promise<void> {
  await sql`DELETE FROM calendar_feeds WHERE user_id = ${userId}`;
}

export async function hasCalendarFeed(userId: string): Promise<boolean> {
  const rows = await sql`SELECT 1 FROM calendar_feeds WHERE user_id = ${userId}`;
  return rows.length > 0;
}

export type FeedOwner =
  | { kind: 'team'; userId: string; role: TeamRole; name: string }
  | { kind: 'talent'; userId: string; talentId: string; name: string };

/** The active team member or talent a feed token belongs to, or null */
export async function resolveCalendarFeed(token: string): Promise<FeedOwner | null> {
  const rows = await sql`
    UPDATE calendar_feeds f SET last_used_at = NOW()
    FROM users u
    WHERE f.user_id = u.id AND f.token_hash = ${hashToken(token)} AND u.is_active
      AND (u.role IN ('admin', 'manager', 'road_manager') OR (u.role = 'artist' AND u.talent_id IS NOT NULL))
    RETURNING u.id, u.role, u.name, u.talent_id
  `;
  const row = rows[0];
  if (!row) return null;
  return row.role === 'artist'
    ? { kind: 'talent', userId: row.id, talentId: row.talent_id, name: row.name }
    : { kind: 'team', userId: row.id, role: row.role, name: row.name };
}

/** Upcoming bookings a talent has said they can't do */
export async function countDeclinedUpcoming(scope: BookingScope): Promise<number> {
  const rows = await sql`
    SELECT COUNT(*) AS n FROM bookings b
    WHERE ${talentVisible(scope, 'b.talent_id')}
      AND b.talent_response = 'declined' AND b.status IN ('hold', 'confirmed') AND b.starts_at > NOW()
  `;
  return Number(rows[0].n);
}

// ---------------------------------------------------------------------------
// Talent payouts
// ---------------------------------------------------------------------------

/** Finished, fee-bearing bookings with no payment recorded yet (oldest first) */
export async function listOwedPayouts(scope: BookingScope): Promise<Booking[]> {
  const rows = await sql`
    ${bookingSelect()}
    WHERE ${talentVisible(scope, 'b.talent_id')}
      AND b.talent_paid_at IS NULL AND b.fee_cents IS NOT NULL
      AND b.status IN ('confirmed', 'completed') AND b.ends_at <= NOW()
    ORDER BY t.name, b.starts_at
    LIMIT 1000
  `;
  return rows.map((row: any) => mapBooking(row, true));
}

/** Payments recorded in the last `days` days (newest first) */
export async function listRecentPayouts(scope: BookingScope, days = 120): Promise<Booking[]> {
  const rows = await sql`
    ${bookingSelect()}
    WHERE ${talentVisible(scope, 'b.talent_id')}
      AND b.talent_paid_at > NOW() - make_interval(days => ${days})
    ORDER BY b.talent_paid_at DESC, t.name
    LIMIT 500
  `;
  return rows.map((row: any) => mapBooking(row, true));
}

/**
 * Record payment of the talent's net for these bookings. Only finished,
 * unpaid, fee-bearing bookings the person can see are marked; the amount
 * paid is the net at this moment (fee minus commission, rounded like the UI).
 */
export async function markPayoutsPaid(
  scope: BookingScope,
  actor: BookingActor,
  bookingIds: string[],
  paidOn: string, // YYYY-MM-DD, UK date
  reference: string | null
): Promise<{ id: string; title: string; talent_name: string; paid_cents: number; currency: string }[]> {
  const rows = await sql`
    UPDATE bookings b SET
      talent_paid_at = (${paidOn}::date + TIME '12:00') AT TIME ZONE ${AGENCY_TIME_ZONE},
      talent_paid_cents = b.fee_cents - ROUND(b.fee_cents * COALESCE(b.commission_percent, 0) / 100)::int,
      talent_paid_reference = ${reference},
      talent_paid_by = ${actor.userId},
      updated_at = NOW()
    WHERE b.id = ANY(${bookingIds}::uuid[])
      AND ${talentVisible(scope, 'b.talent_id')}
      AND b.talent_paid_at IS NULL AND b.fee_cents IS NOT NULL
      AND b.status IN ('confirmed', 'completed') AND b.ends_at <= NOW()
    RETURNING b.id, b.title, b.talent_paid_cents, b.currency, (SELECT name FROM talents WHERE id = b.talent_id) AS talent_name
  `;
  return rows.map((row: any) => ({
    id: row.id,
    title: row.title,
    talent_name: row.talent_name,
    paid_cents: Number(row.talent_paid_cents),
    currency: row.currency,
  }));
}

/** Undo a recorded payment (e.g. marked by mistake) */
export async function clearPayout(scope: BookingScope, bookingId: string): Promise<boolean> {
  const rows = await sql`
    UPDATE bookings b SET talent_paid_at = NULL, talent_paid_cents = NULL, talent_paid_reference = NULL,
      talent_paid_by = NULL, updated_at = NOW()
    WHERE b.id = ${bookingId} AND ${talentVisible(scope, 'b.talent_id')} AND b.talent_paid_at IS NOT NULL
    RETURNING b.id
  `;
  return rows.length > 0;
}

/** Count and total owed, per currency (dashboard) */
export async function summariseOwedPayouts(scope: BookingScope): Promise<{ count: number; totals: { currency: string; cents: number }[] }> {
  const rows = await sql`
    SELECT b.currency, COUNT(*) AS n,
      SUM(b.fee_cents - ROUND(b.fee_cents * COALESCE(b.commission_percent, 0) / 100)::int) AS cents
    FROM bookings b
    WHERE ${talentVisible(scope, 'b.talent_id')}
      AND b.talent_paid_at IS NULL AND b.fee_cents IS NOT NULL
      AND b.status IN ('confirmed', 'completed') AND b.ends_at <= NOW()
    GROUP BY b.currency
  `;
  return {
    count: rows.reduce((sum: number, row: any) => sum + Number(row.n), 0),
    totals: rows.map((row: any) => ({ currency: row.currency, cents: Number(row.cents) })),
  };
}
