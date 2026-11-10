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
