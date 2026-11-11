import { sql } from '../client';
import { newTicketCode } from '@/lib/tickets/codes';

// ---------------------------------------------------------------------------
// Tickets at the door: one row (and QR code) per person on a paid order
// ---------------------------------------------------------------------------

export type AdmittedVia = 'qr' | 'card' | 'manual';

export interface DoorTicket {
  id: string;
  order_id: string;
  number: number;
  quantity: number;
  ticket_type_name: string;
  code: string;
  admitted_at: string | null;
  admitted_by_name: string | null;
  admitted_via: AdmittedVia | null;
}

const ticketSelect = () => sql`
  SELECT t.id, t.order_id, t.number, o.quantity, t.ticket_type_name, t.code, t.admitted_at, t.admitted_by_name, t.admitted_via
  FROM tickets t JOIN ticket_orders o ON o.id = t.order_id
`;

function mapTicket(row: any): DoorTicket {
  return {
    id: row.id,
    order_id: row.order_id,
    number: Number(row.number),
    quantity: Number(row.quantity),
    ticket_type_name: row.ticket_type_name,
    code: row.code,
    admitted_at: row.admitted_at ? new Date(row.admitted_at).toISOString() : null,
    admitted_by_name: row.admitted_by_name ?? null,
    admitted_via: (row.admitted_via as AdmittedVia | null) ?? null,
  };
}

/**
 * The order's tickets, making any that are missing (numbered 1..quantity
 * across its items, in the order the ticket types are listed). Only paid orders have tickets; others return [].
 */
export async function ensureOrderTickets(orderId: string): Promise<DoorTicket[]> {
  const [order] = await sql`SELECT status FROM ticket_orders WHERE id = ${orderId}`;
  if (!order || order.status !== 'paid') return [];
  // In the order the ticket types are listed for sale, then by name
  const items = await sql`
    SELECT i.name, i.quantity
    FROM ticket_order_items i LEFT JOIN ticket_types tt ON tt.id = i.ticket_type_id
    WHERE i.order_id = ${orderId}
    ORDER BY tt.sort_order NULLS LAST, i.name, i.id
  `;
  const wanted: { number: number; name: string }[] = [];
  for (const item of items as any[]) {
    for (let i = 0; i < Number(item.quantity); i++) wanted.push({ number: wanted.length + 1, name: item.name });
  }
  if (wanted.length > 0) {
    await sql`
      INSERT INTO tickets (order_id, number, ticket_type_name, code)
      SELECT ${orderId}, w.number, w.name, w.code
      FROM unnest(${wanted.map((w) => w.number)}::int[], ${wanted.map((w) => w.name)}::text[], ${wanted.map(() => newTicketCode())}::text[])
        AS w(number, name, code)
      ON CONFLICT (order_id, number) DO NOTHING
    `;
  }
  const rows = await sql`${ticketSelect()} WHERE t.order_id = ${orderId} ORDER BY t.number`;
  return rows.map(mapTicket);
}

// ---------------------------------------------------------------------------
// The confirmation PDF
// ---------------------------------------------------------------------------

export interface PdfOrder {
  id: string;
  reference: string;
  status: string;
  buyer_name: string;
  event_title: string;
  event_starts_at: string | null;
  venue: string | null;
  pdf_key: string | null;
}

/** "Venue name, City" from the event's venue */
function venueLine(venue: any): string | null {
  if (!venue || typeof venue !== 'object') return null;
  const parts = [venue.name, venue.city].filter((p) => typeof p === 'string' && p.trim() !== '');
  return parts.length > 0 ? parts.join(', ') : null;
}

export async function getPdfOrder(orderId: string): Promise<PdfOrder | null> {
  const rows = await sql`
    SELECT o.id, o.reference, o.status, o.first_name, o.last_name, o.pdf_key,
      COALESCE(e.title, o.event_title) AS event_title, e.start_time, e.venue
    FROM ticket_orders o LEFT JOIN events e ON e.id = o.event_id
    WHERE o.id = ${orderId}
  `;
  const r: any = rows[0];
  if (!r) return null;
  return {
    id: r.id,
    reference: r.reference,
    status: r.status,
    buyer_name: `${r.first_name} ${r.last_name}`.trim(),
    event_title: r.event_title,
    event_starts_at: r.start_time ? new Date(r.start_time).toISOString() : null,
    venue: venueLine(r.venue),
    pdf_key: r.pdf_key ?? null,
  };
}

export async function setOrderPdf(orderId: string, key: string): Promise<void> {
  await sql`UPDATE ticket_orders SET pdf_key = ${key}, pdf_created_at = NOW(), updated_at = NOW() WHERE id = ${orderId}`;
}

// ---------------------------------------------------------------------------
// Letting people in
// ---------------------------------------------------------------------------

export interface DoorActor {
  userId: string | null;
  name: string | null;
}

export type AdmitStatus = 'admitted' | 'already_used' | 'other_event' | 'refunded' | 'cancelled' | 'unknown';

export interface DoorOrderSummary {
  id: string;
  reference: string;
  name: string;
  in_count: number;
  quantity: number;
}

export interface AdmitResult {
  status: AdmitStatus;
  ticket?: DoorTicket;
  order?: DoorOrderSummary;
  /** For a ticket to another event */
  event_title?: string;
}

async function orderSummary(orderId: string): Promise<DoorOrderSummary> {
  const [row] = await sql`
    SELECT o.id, o.reference, o.first_name, o.last_name, o.quantity,
      (SELECT COUNT(*) FROM tickets t WHERE t.order_id = o.id AND t.admitted_at IS NOT NULL) AS in_count
    FROM ticket_orders o WHERE o.id = ${orderId}
  `;
  return {
    id: row.id,
    reference: row.reference,
    name: `${row.first_name} ${row.last_name}`.trim(),
    in_count: Number(row.in_count),
    quantity: Number(row.quantity),
  };
}

async function ticketById(id: string): Promise<DoorTicket> {
  const [row] = await sql`${ticketSelect()} WHERE t.id = ${id}`;
  return mapTicket(row);
}

/**
 * Admit one ticket matched by `match` (its code or id). Claiming is a single
 * UPDATE on a ticket not yet admitted, on a paid order for this event, so two
 * door devices can't both let the same ticket in. When nothing is claimed,
 * the ticket is read to say why.
 */
async function admitWhere(
  eventId: string,
  match: { code: string } | { id: string },
  actor: DoorActor,
  via: AdmittedVia
): Promise<AdmitResult> {
  const where = 'code' in match ? sql`t.code = ${match.code}` : sql`t.id = ${match.id}`;
  const claimed = await sql`
    WITH claimed AS (
      UPDATE tickets t
      SET admitted_at = NOW(), admitted_by = ${actor.userId}, admitted_by_name = ${actor.name}, admitted_via = ${via}
      FROM ticket_orders o
      WHERE ${where} AND t.admitted_at IS NULL
        AND o.id = t.order_id AND o.status = 'paid' AND o.event_id = ${eventId}
      RETURNING t.id, t.order_id
    ),
    arrived AS (
      UPDATE ticket_orders SET arrived_at = COALESCE(arrived_at, NOW()), updated_at = NOW()
      WHERE id IN (SELECT order_id FROM claimed)
      RETURNING id
    )
    SELECT id, order_id FROM claimed
  `;
  if (claimed[0]) {
    return { status: 'admitted', ticket: await ticketById(claimed[0].id), order: await orderSummary(claimed[0].order_id) };
  }

  const [row] = await sql`
    SELECT t.id, t.order_id, t.admitted_at, o.status, o.event_id, COALESCE(e.title, o.event_title) AS event_title
    FROM tickets t JOIN ticket_orders o ON o.id = t.order_id LEFT JOIN events e ON e.id = o.event_id
    WHERE ${where}
  `;
  if (!row) return { status: 'unknown' };
  if (row.event_id !== eventId) return { status: 'other_event', event_title: row.event_title };
  if (row.status === 'refunded' || row.status === 'cancelled') return { status: row.status };
  if (row.admitted_at) {
    return { status: 'already_used', ticket: await ticketById(row.id), order: await orderSummary(row.order_id) };
  }
  return { status: 'unknown' };
}

/** A QR scan at the door */
export function admitByCode(eventId: string, code: string, actor: DoorActor): Promise<AdmitResult> {
  return admitWhere(eventId, { code }, actor, 'qr');
}

/** Let a ticket in by hand (Find a ticket) or for a VIP card tap */
export function admitTicket(ticketId: string, eventId: string, actor: DoorActor, via: 'card' | 'manual'): Promise<AdmitResult> {
  return admitWhere(eventId, { id: ticketId }, actor, via);
}

/** Undo an admission (e.g. the wrong person was scanned); false when it wasn't admitted */
export async function undoTicket(ticketId: string, eventId: string): Promise<boolean> {
  const rows = await sql`
    UPDATE tickets t SET admitted_at = NULL, admitted_by = NULL, admitted_by_name = NULL, admitted_via = NULL
    FROM ticket_orders o
    WHERE t.id = ${ticketId} AND t.admitted_at IS NOT NULL AND o.id = t.order_id AND o.event_id = ${eventId}
    RETURNING t.order_id
  `;
  if (!rows[0]) return false;
  await sql`
    UPDATE ticket_orders SET arrived_at = NULL, updated_at = NOW()
    WHERE id = ${rows[0].order_id} AND NOT EXISTS (SELECT 1 FROM tickets WHERE order_id = ${rows[0].order_id} AND admitted_at IS NOT NULL)
  `;
  return true;
}

export interface DoorOrder {
  id: string;
  reference: string;
  name: string;
  email: string;
  quantity: number;
  tickets: DoorTicket[];
}

/** Paid orders for the event matching a name, email or order reference (up to 20) */
export async function searchDoorOrders(eventId: string, q: string): Promise<DoorOrder[]> {
  const text = q.trim();
  if (text.length < 2) return [];
  const like = `%${text.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
  const orders = await sql`
    SELECT id, reference, first_name, last_name, email, quantity
    FROM ticket_orders
    WHERE event_id = ${eventId} AND status = 'paid'
      AND (first_name ILIKE ${like} ESCAPE '\\' OR last_name ILIKE ${like} ESCAPE '\\'
        OR (first_name || ' ' || last_name) ILIKE ${like} ESCAPE '\\'
        OR email ILIKE ${like} ESCAPE '\\' OR reference ILIKE ${like} ESCAPE '\\')
    ORDER BY last_name, first_name
    LIMIT 20
  `;
  const result: DoorOrder[] = [];
  for (const o of orders as any[]) {
    result.push({
      id: o.id,
      reference: o.reference,
      name: `${o.first_name} ${o.last_name}`.trim(),
      email: o.email,
      quantity: Number(o.quantity),
      tickets: await ensureOrderTickets(o.id),
    });
  }
  return result;
}

/** People in, out of all tickets on paid orders for the event */
export async function ticketCounts(eventId: string): Promise<{ in: number; total: number }> {
  const [row] = await sql`
    SELECT
      COALESCE((SELECT SUM(quantity) FROM ticket_orders WHERE event_id = ${eventId} AND status = 'paid'), 0) AS total,
      (SELECT COUNT(*) FROM tickets t JOIN ticket_orders o ON o.id = t.order_id
        WHERE o.event_id = ${eventId} AND o.status = 'paid' AND t.admitted_at IS NOT NULL) AS in_count
  `;
  return { in: Number(row.in_count), total: Number(row.total) };
}

/** The admin door list tick: let everyone left on the order in, or undo them all */
export async function setAllAdmitted(orderId: string, admitted: boolean, actor: DoorActor): Promise<boolean> {
  const [order] = await sql`SELECT status FROM ticket_orders WHERE id = ${orderId}`;
  if (!order || order.status !== 'paid') return false;
  if (admitted) {
    await ensureOrderTickets(orderId);
    await sql`
      UPDATE tickets SET admitted_at = NOW(), admitted_by = ${actor.userId}, admitted_by_name = ${actor.name}, admitted_via = 'manual'
      WHERE order_id = ${orderId} AND admitted_at IS NULL
    `;
    await sql`UPDATE ticket_orders SET arrived_at = COALESCE(arrived_at, NOW()), updated_at = NOW() WHERE id = ${orderId}`;
  } else {
    await sql`UPDATE tickets SET admitted_at = NULL, admitted_by = NULL, admitted_by_name = NULL, admitted_via = NULL WHERE order_id = ${orderId}`;
    await sql`UPDATE ticket_orders SET arrived_at = NULL, updated_at = NOW() WHERE id = ${orderId}`;
  }
  return true;
}

// ---------------------------------------------------------------------------
// VIP cards at events that sell tickets on the website
// ---------------------------------------------------------------------------

/** The event sells tickets on the website (it has at least one ticket type) */
export async function eventSellsTickets(eventId: string): Promise<boolean> {
  const rows = await sql`SELECT 1 FROM ticket_types WHERE event_id = ${eventId} LIMIT 1`;
  return rows.length > 0;
}

/**
 * A member's tickets for the event: paid orders linked to them (bought from
 * their card) or bought with their account's email, in any letter case.
 */
export async function memberTicketsForEvent(eventId: string, userId: string): Promise<DoorTicket[]> {
  const orders = await sql`
    SELECT o.id FROM ticket_orders o
    WHERE o.event_id = ${eventId} AND o.status = 'paid'
      AND (o.member_user_id = ${userId}
        OR lower(o.email) = (SELECT lower(email) FROM users WHERE id = ${userId}))
    ORDER BY o.paid_at NULLS LAST, o.created_at
  `;
  const tickets: DoorTicket[] = [];
  for (const o of orders as any[]) tickets.push(...(await ensureOrderTickets(o.id)));
  return tickets;
}
