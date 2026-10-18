import { randomBytes, timingSafeEqual } from 'crypto';
import { sql } from '../client';
import { HOLD_MINUTES, type PublicOrder, type PublicTicketEvent, type PublicTicketType } from '@/lib/tickets/types';
import type { ticketOrderSchema, ticketTypeSchema } from '@/lib/tickets/schemas';
import type { z } from 'zod';

/**
 * Ticket sales: ticket types, orders and their SumUp payment pages.
 * Capacity is checked inside ticket_order_create() (migration 038), which
 * locks the event's ticket types while it counts.
 */

const iso = (v: unknown): string | null => (v ? new Date(v as string).toISOString() : null);

/** Tickets that count against capacity: paid, or unpaid and still held */
const HELD = sql`(o.status = 'paid' OR (o.status IN ('pending', 'payment_failed') AND o.hold_until > NOW()))`;

const londonTime = (d: Date) =>
  new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/London', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(d);

// ---------------------------------------------------------------------------
// Public: the buying page
// ---------------------------------------------------------------------------

export async function getPublicTicketEvent(idOrSlug: string): Promise<PublicTicketEvent | null> {
  const isUuid = /^[0-9a-f-]{36}$/i.test(idOrSlug);
  const events = await sql`
    SELECT id, title, start_time, end_time, image_url, status, is_published,
      NULLIF(concat_ws(', ', NULLIF(venue->>'name', ''), NULLIF(venue->>'city', '')), '') AS venue
    FROM events WHERE ${isUuid ? sql`id = ${idOrSlug}::uuid` : sql`slug = ${idOrSlug}`} LIMIT 1
  `;
  const ev = events[0];
  if (!ev || ev.is_published === false) return null;

  const types = await sql`
    SELECT t.*,
      (SELECT COALESCE(SUM(i.quantity), 0) FROM ticket_order_items i JOIN ticket_orders o ON o.id = i.order_id
        WHERE i.ticket_type_id = t.id AND ${HELD})::int AS taken
    FROM ticket_types t WHERE t.event_id = ${ev.id} AND t.is_active ORDER BY t.sort_order, t.price_cents, t.name
  `;
  const now = Date.now();
  const eventOver = ['cancelled', 'completed'].includes(ev.status);
  const salesClose = (t: any) => new Date(t.sales_end ?? ev.end_time ?? ev.start_time).getTime();

  const ticketTypes: PublicTicketType[] = types.map((t: any) => {
    const remaining = t.capacity === null ? null : Math.max(0, t.capacity - t.taken);
    let note: string | null = null;
    if (eventOver || salesClose(t) <= now) note = 'Sales have closed';
    else if (t.sales_start && new Date(t.sales_start).getTime() > now) note = `On sale from ${londonTime(new Date(t.sales_start))}`;
    else if (remaining === 0) note = 'Sold out';
    return {
      id: t.id,
      name: t.name,
      description: t.description,
      price_cents: t.price_cents,
      currency: t.currency,
      max_per_order: remaining === null ? t.max_per_order : Math.min(t.max_per_order, remaining),
      remaining,
      on_sale: note === null,
      note,
    };
  });

  return {
    id: ev.id,
    title: ev.title,
    starts_at: iso(ev.start_time)!,
    venue: ev.venue ?? null,
    image_url: ev.image_url ?? null,
    ticket_types: ticketTypes,
  };
}

function newReference(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = randomBytes(6);
  return `VT-${Array.from(bytes, (b) => alphabet[b % alphabet.length]).join('')}`;
}

export type OrderInput = z.infer<typeof ticketOrderSchema>;

/** Create an unpaid order holding its tickets. Returns a message for the buyer if it can't. */
export async function createTicketOrder(input: OrderInput): Promise<{ id: string; token: string; total_cents: number } | { error: string }> {
  const token = randomBytes(24).toString('base64url');
  const buyer = {
    first_name: input.first_name,
    last_name: input.last_name,
    email: input.email,
    phone: input.phone ?? null,
    instagram: input.instagram,
    city: input.city ?? null,
    age_range: input.age_range ?? null,
    heard_from: input.heard_from ?? null,
    marketing_consent: input.marketing_consent ?? false,
    source: input.source ?? 'website',
    utm_source: input.utm_source ?? null,
    utm_medium: input.utm_medium ?? null,
    utm_campaign: input.utm_campaign ?? null,
    referrer: input.referrer ?? null,
  };

  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const rows = await sql`
        SELECT ticket_order_create(
          ${input.event_id}::uuid, ${JSON.stringify(input.items)}::jsonb, ${JSON.stringify(buyer)}::jsonb,
          ${newReference()}, ${token}, ${HOLD_MINUTES}
        ) AS id
      `;
      const id = rows[0].id as string;
      const totals = await sql`SELECT total_cents FROM ticket_orders WHERE id = ${id}`;
      return { id, token, total_cents: Number(totals[0].total_cents) };
    } catch (error: any) {
      if (error?.code === 'P0001') return { error: error.message };
      if (error?.code === '23505' && String(error?.constraint ?? error?.message).includes('reference')) continue;
      throw error;
    }
  }
  throw new Error('Could not create a unique order reference');
}

export interface PayableOrder {
  id: string;
  reference: string;
  status: string;
  total_cents: number;
  currency: string;
  payment_attempts: number;
  event_title: string;
  quantity: number;
  email: string;
  access_token: string;
}

export async function getPayableOrder(orderId: string): Promise<PayableOrder | null> {
  const rows = await sql`
    SELECT id, reference, status, total_cents, currency, payment_attempts, event_title, quantity, email, access_token
    FROM ticket_orders WHERE id = ${orderId} LIMIT 1
  `;
  const r = rows[0];
  return r ? { ...r, total_cents: Number(r.total_cents), payment_attempts: Number(r.payment_attempts) } as PayableOrder : null;
}

/** The order if the token matches (the link the buyer was given) */
export async function getOrderWithToken(orderId: string, token: string): Promise<PayableOrder | null> {
  const order = await getPayableOrder(orderId);
  if (!order || token.length < 20) return null;
  const a = Buffer.from(order.access_token);
  const b = Buffer.from(token);
  return a.length === b.length && timingSafeEqual(a, b) ? order : null;
}

/**
 * Before paying again: an unpaid order whose hold has ended takes its
 * tickets back if they're still there. False if they've gone.
 */
export async function renewHold(orderId: string): Promise<boolean> {
  const rows = await sql`
    WITH need AS (
      SELECT i.ticket_type_id, i.quantity, t.capacity,
        (SELECT COALESCE(SUM(i2.quantity), 0) FROM ticket_order_items i2 JOIN ticket_orders o ON o.id = i2.order_id
          WHERE i2.ticket_type_id = i.ticket_type_id AND o.id <> ${orderId} AND ${HELD}) AS taken
      FROM ticket_order_items i JOIN ticket_types t ON t.id = i.ticket_type_id
      WHERE i.order_id = ${orderId}
    )
    UPDATE ticket_orders SET hold_until = NOW() + make_interval(mins => ${HOLD_MINUTES}), updated_at = NOW()
    WHERE id = ${orderId} AND status IN ('pending', 'payment_failed', 'expired')
      AND NOT EXISTS (SELECT 1 FROM need WHERE capacity IS NOT NULL AND taken + quantity > capacity)
    RETURNING id
  `;
  return rows.length > 0;
}

// ---------------------------------------------------------------------------
// SumUp payment pages
// ---------------------------------------------------------------------------

export async function recordTicketCheckout(order: PayableOrder, checkoutId: string, reference: string): Promise<boolean> {
  const [, updated] = await sql.transaction([
    sql`
      INSERT INTO ticket_order_checkouts (checkout_id, order_id, reference, amount_cents, currency)
      VALUES (${checkoutId}, ${order.id}, ${reference}, ${order.total_cents}, ${order.currency})
    `,
    sql`
      UPDATE ticket_orders SET sumup_checkout_id = ${checkoutId}, payment_attempts = payment_attempts + 1,
        status = 'pending', updated_at = NOW()
      WHERE id = ${order.id} AND status IN ('pending', 'payment_failed', 'expired')
      RETURNING id
    `,
  ]);
  return (updated as unknown[]).length > 0;
}

export interface TicketCheckoutRecord {
  checkout_id: string;
  order_id: string;
  reference: string;
  amount_cents: number;
  currency: string;
  outcome: string;
}

export async function getTicketCheckout(checkoutId: string): Promise<TicketCheckoutRecord | null> {
  const rows = await sql`SELECT * FROM ticket_order_checkouts WHERE checkout_id = ${checkoutId} LIMIT 1`;
  const r = rows[0];
  return r
    ? { checkout_id: r.checkout_id, order_id: r.order_id, reference: r.reference, amount_cents: Number(r.amount_cents), currency: r.currency, outcome: r.outcome }
    : null;
}

export async function getLatestTicketCheckout(orderId: string): Promise<TicketCheckoutRecord | null> {
  const rows = await sql`SELECT sumup_checkout_id FROM ticket_orders WHERE id = ${orderId} LIMIT 1`;
  return rows[0]?.sumup_checkout_id ? getTicketCheckout(rows[0].sumup_checkout_id) : null;
}

export async function setTicketCheckoutOutcome(checkoutId: string, outcome: 'paid' | 'failed' | 'expired', transactionCode: string | null = null) {
  await sql`
    UPDATE ticket_order_checkouts SET outcome = ${outcome}, transaction_code = COALESCE(${transactionCode}, transaction_code), updated_at = NOW()
    WHERE checkout_id = ${checkoutId} AND outcome <> 'paid'
  `;
}

/** True only for the call that moved the order to paid (so points are awarded once) */
export async function markTicketOrderPaid(orderId: string, checkoutId: string | null, transactionCode: string | null): Promise<boolean> {
  const rows = await sql`
    UPDATE ticket_orders SET status = 'paid', paid_at = NOW(), transaction_code = ${transactionCode},
      sumup_checkout_id = COALESCE(${checkoutId}, sumup_checkout_id), updated_at = NOW()
    WHERE id = ${orderId} AND status IN ('pending', 'payment_failed', 'expired')
    RETURNING id
  `;
  return rows.length > 0;
}

/** A payment page failed or expired: only the latest page decides what the buyer sees */
export async function markTicketOrderUnpaid(orderId: string, checkoutId: string, state: 'failed' | 'expired') {
  await sql`
    UPDATE ticket_orders SET status = ${state === 'expired' ? 'expired' : 'payment_failed'}, updated_at = NOW()
    WHERE id = ${orderId} AND status = 'pending' AND sumup_checkout_id = ${checkoutId}
  `;
}

export async function setOrderPoints(orderId: string, memberId: string, points: number) {
  await sql`UPDATE ticket_orders SET member_user_id = ${memberId}, points_awarded = ${points}, updated_at = NOW() WHERE id = ${orderId}`;
}

/** Members (and artists) earn points when the email they buy with is their membership email */
export async function findMemberByEmail(email: string): Promise<string | null> {
  const rows = await sql`
    SELECT id FROM users WHERE lower(email) = lower(${email}) AND role IN ('vip', 'artist') AND is_active
    ORDER BY created_at LIMIT 1
  `;
  return rows[0]?.id ?? null;
}

export async function getPublicOrder(orderId: string): Promise<PublicOrder | null> {
  const rows = await sql`
    SELECT o.*, e.start_time,
      NULLIF(concat_ws(', ', NULLIF(e.venue->>'name', ''), NULLIF(e.venue->>'city', '')), '') AS venue,
      COALESCE((SELECT json_agg(json_build_object('name', i.name, 'quantity', i.quantity, 'unit_price_cents', i.unit_price_cents) ORDER BY i.name)
        FROM ticket_order_items i WHERE i.order_id = o.id), '[]') AS items
    FROM ticket_orders o LEFT JOIN events e ON e.id = o.event_id
    WHERE o.id = ${orderId} LIMIT 1
  `;
  const r = rows[0];
  if (!r) return null;
  return {
    id: r.id,
    reference: r.reference,
    status: r.status,
    event: { id: r.event_id, title: r.event_title, starts_at: iso(r.start_time), venue: r.venue ?? null },
    first_name: r.first_name,
    email: r.email,
    quantity: r.quantity,
    total_cents: Number(r.total_cents),
    currency: r.currency,
    items: r.items,
    points_awarded: r.points_awarded,
    can_retry: ['pending', 'payment_failed', 'expired'].includes(r.status),
  };
}

// ---------------------------------------------------------------------------
// Admin
// ---------------------------------------------------------------------------

export interface AdminTicketType {
  id: string;
  event_id: string;
  name: string;
  description: string | null;
  price_cents: number;
  currency: string;
  capacity: number | null;
  max_per_order: number;
  sales_start: string | null;
  sales_end: string | null;
  is_active: boolean;
  sort_order: number;
  sold: number;
  held: number;
}

export async function listTicketTypes(eventId: string): Promise<AdminTicketType[]> {
  const rows = await sql`
    SELECT t.*,
      (SELECT COALESCE(SUM(i.quantity), 0) FROM ticket_order_items i JOIN ticket_orders o ON o.id = i.order_id
        WHERE i.ticket_type_id = t.id AND o.status = 'paid')::int AS sold,
      (SELECT COALESCE(SUM(i.quantity), 0) FROM ticket_order_items i JOIN ticket_orders o ON o.id = i.order_id
        WHERE i.ticket_type_id = t.id AND o.status IN ('pending', 'payment_failed') AND o.hold_until > NOW())::int AS held
    FROM ticket_types t WHERE t.event_id = ${eventId} ORDER BY t.sort_order, t.price_cents, t.name
  `;
  return rows.map((t: any) => ({
    id: t.id,
    event_id: t.event_id,
    name: t.name,
    description: t.description,
    price_cents: t.price_cents,
    currency: t.currency,
    capacity: t.capacity,
    max_per_order: t.max_per_order,
    sales_start: iso(t.sales_start),
    sales_end: iso(t.sales_end),
    is_active: t.is_active,
    sort_order: t.sort_order,
    sold: t.sold,
    held: t.held,
  }));
}

export type TicketTypeInput = z.infer<typeof ticketTypeSchema>;

export async function createTicketType(input: TicketTypeInput): Promise<string> {
  const rows = await sql`
    INSERT INTO ticket_types (event_id, name, description, price_cents, capacity, max_per_order, sales_start, sales_end, is_active, sort_order)
    VALUES (${input.event_id}, ${input.name}, ${input.description ?? null}, ${input.price_cents}, ${input.capacity ?? null},
      ${input.max_per_order ?? 6}, ${input.sales_start ?? null}, ${input.sales_end ?? null}, ${input.is_active ?? true}, ${input.sort_order ?? 0})
    RETURNING id
  `;
  return rows[0].id;
}

/** Price changes apply to new orders only; orders keep what they paid */
export async function updateTicketType(id: string, input: TicketTypeInput): Promise<boolean> {
  const rows = await sql`
    UPDATE ticket_types SET name = ${input.name}, description = ${input.description ?? null}, price_cents = ${input.price_cents},
      capacity = ${input.capacity ?? null}, max_per_order = ${input.max_per_order ?? 6}, sales_start = ${input.sales_start ?? null},
      sales_end = ${input.sales_end ?? null}, is_active = ${input.is_active ?? true}, sort_order = ${input.sort_order ?? 0}, updated_at = NOW()
    WHERE id = ${id} AND event_id = ${input.event_id}
    RETURNING id
  `;
  return rows.length > 0;
}

/** Delete a ticket type nobody has ordered; otherwise it's switched off instead */
export async function deleteTicketType(id: string): Promise<'deleted' | 'deactivated' | 'not_found'> {
  const used = await sql`SELECT 1 FROM ticket_order_items WHERE ticket_type_id = ${id} LIMIT 1`;
  if (used.length > 0) {
    const rows = await sql`UPDATE ticket_types SET is_active = false, updated_at = NOW() WHERE id = ${id} RETURNING id`;
    return rows.length > 0 ? 'deactivated' : 'not_found';
  }
  const rows = await sql`DELETE FROM ticket_types WHERE id = ${id} RETURNING id`;
  return rows.length > 0 ? 'deleted' : 'not_found';
}

export async function eventExists(eventId: string): Promise<boolean> {
  const rows = await sql`SELECT 1 FROM events WHERE id = ${eventId}`;
  return rows.length > 0;
}

/** Events for the admin picker: upcoming first, then past ones that sold tickets */
export async function listTicketEvents(): Promise<{ id: string; title: string; starts_at: string; status: string; ticket_types: number; sold: number }[]> {
  const rows = await sql`
    SELECT e.id, e.title, e.start_time, e.status,
      (SELECT COUNT(*) FROM ticket_types t WHERE t.event_id = e.id)::int AS ticket_types,
      (SELECT COALESCE(SUM(o.quantity), 0) FROM ticket_orders o WHERE o.event_id = e.id AND o.status = 'paid')::int AS sold
    FROM events e
    WHERE e.status <> 'cancelled' AND (e.start_time > NOW() - interval '1 day'
      OR EXISTS (SELECT 1 FROM ticket_orders o WHERE o.event_id = e.id))
    ORDER BY (e.start_time < NOW()), CASE WHEN e.start_time >= NOW() THEN e.start_time END ASC, e.start_time DESC
    LIMIT 200
  `;
  return rows.map((r: any) => ({ id: r.id, title: r.title, starts_at: iso(r.start_time)!, status: r.status, ticket_types: r.ticket_types, sold: r.sold }));
}

export interface AdminTicketOrder {
  id: string;
  reference: string;
  event_id: string | null;
  event_title: string;
  status: string;
  hold_ended: boolean;
  quantity: number;
  total_cents: number;
  currency: string;
  items: { name: string; quantity: number; unit_price_cents: number }[];
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  instagram: string;
  city: string | null;
  age_range: string | null;
  heard_from: string | null;
  marketing_consent: boolean;
  source: string;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  referrer: string | null;
  member: { id: string; name: string } | null;
  points_awarded: number;
  previous_orders: number;
  transaction_code: string | null;
  paid_at: string | null;
  refunded_at: string | null;
  refund_reason: string | null;
  arrived_at: string | null;
  created_at: string;
}

export async function listTicketOrders(filters: { eventId?: string | null; status?: string | null; search?: string | null; limit?: number }): Promise<AdminTicketOrder[]> {
  const search = filters.search?.trim() ? `%${filters.search.trim().replace(/^@/, '').toLowerCase()}%` : null;
  const rows = await sql`
    SELECT o.*, u.name AS member_name,
      COALESCE((SELECT json_agg(json_build_object('name', i.name, 'quantity', i.quantity, 'unit_price_cents', i.unit_price_cents) ORDER BY i.name)
        FROM ticket_order_items i WHERE i.order_id = o.id), '[]') AS items,
      (SELECT COUNT(*) FROM ticket_orders p WHERE lower(p.email) = lower(o.email) AND p.status = 'paid' AND p.created_at < o.created_at)::int AS previous_orders
    FROM ticket_orders o LEFT JOIN users u ON u.id = o.member_user_id
    WHERE (${filters.eventId ?? null}::uuid IS NULL OR o.event_id = ${filters.eventId ?? null}::uuid)
      AND (${filters.status ?? null}::text IS NULL OR o.status = ${filters.status ?? null})
      AND (${search}::text IS NULL OR lower(o.first_name || ' ' || o.last_name) LIKE ${search} OR lower(o.email) LIKE ${search}
        OR o.instagram LIKE ${search} OR lower(o.reference) LIKE ${search})
    ORDER BY o.created_at DESC
    LIMIT ${filters.limit ?? 500}
  `;
  return rows.map((r: any) => ({
    id: r.id,
    reference: r.reference,
    event_id: r.event_id,
    event_title: r.event_title,
    status: r.status,
    hold_ended: r.status !== 'paid' && new Date(r.hold_until).getTime() < Date.now(),
    quantity: r.quantity,
    total_cents: Number(r.total_cents),
    currency: r.currency,
    items: r.items,
    first_name: r.first_name,
    last_name: r.last_name,
    email: r.email,
    phone: r.phone,
    instagram: r.instagram,
    city: r.city,
    age_range: r.age_range,
    heard_from: r.heard_from,
    marketing_consent: r.marketing_consent,
    source: r.source,
    utm_source: r.utm_source,
    utm_medium: r.utm_medium,
    utm_campaign: r.utm_campaign,
    referrer: r.referrer,
    member: r.member_user_id ? { id: r.member_user_id, name: r.member_name } : null,
    points_awarded: r.points_awarded,
    previous_orders: r.previous_orders,
    transaction_code: r.transaction_code,
    paid_at: iso(r.paid_at),
    refunded_at: iso(r.refunded_at),
    refund_reason: r.refund_reason,
    arrived_at: iso(r.arrived_at),
    created_at: iso(r.created_at)!,
  }));
}

export interface TicketSummary {
  orders: number;
  tickets: number;
  revenue_cents: number;
  buyers: number;
  repeat_buyers: number;
  member_orders: number;
  marketing_opt_ins: number;
  arrived_tickets: number;
  by_type: { name: string; tickets: number; revenue_cents: number }[];
  by_heard_from: { key: string | null; orders: number }[];
  by_source: { key: string; orders: number }[];
  by_campaign: { key: string; orders: number }[];
  by_city: { key: string; orders: number }[];
  by_age: { key: string | null; orders: number }[];
  by_day: { day: string; tickets: number }[];
}

/** Paid orders only; for one event or all of them */
export async function ticketSummary(eventId: string | null): Promise<TicketSummary> {
  const ev = eventId;
  const paid = sql`o.status = 'paid' AND (${ev}::uuid IS NULL OR o.event_id = ${ev}::uuid)`;
  const [totals, byType, heard, source, campaign, city, age, day] = await Promise.all([
    sql`
      SELECT COUNT(*)::int AS orders, COALESCE(SUM(o.quantity), 0)::int AS tickets, COALESCE(SUM(o.total_cents), 0)::bigint AS revenue,
        COUNT(DISTINCT lower(o.email))::int AS buyers,
        COUNT(DISTINCT lower(o.email)) FILTER (WHERE EXISTS (
          SELECT 1 FROM ticket_orders p WHERE lower(p.email) = lower(o.email) AND p.status = 'paid' AND p.event_id IS DISTINCT FROM o.event_id
        ))::int AS repeat_buyers,
        COUNT(*) FILTER (WHERE o.member_user_id IS NOT NULL)::int AS member_orders,
        COUNT(*) FILTER (WHERE o.marketing_consent)::int AS opt_ins,
        COALESCE(SUM(o.quantity) FILTER (WHERE o.arrived_at IS NOT NULL), 0)::int AS arrived
      FROM ticket_orders o WHERE ${paid}
    `,
    sql`
      SELECT i.name, SUM(i.quantity)::int AS tickets, SUM(i.quantity * i.unit_price_cents)::bigint AS revenue
      FROM ticket_order_items i JOIN ticket_orders o ON o.id = i.order_id WHERE ${paid}
      GROUP BY i.name ORDER BY tickets DESC
    `,
    sql`SELECT o.heard_from AS key, COUNT(*)::int AS orders FROM ticket_orders o WHERE ${paid} GROUP BY 1 ORDER BY 2 DESC`,
    sql`SELECT o.source AS key, COUNT(*)::int AS orders FROM ticket_orders o WHERE ${paid} GROUP BY 1 ORDER BY 2 DESC`,
    sql`
      SELECT concat_ws(' / ', o.utm_source, o.utm_medium, o.utm_campaign) AS key, COUNT(*)::int AS orders
      FROM ticket_orders o WHERE ${paid} AND (o.utm_source IS NOT NULL OR o.utm_campaign IS NOT NULL)
      GROUP BY 1 ORDER BY 2 DESC LIMIT 15
    `,
    sql`
      SELECT initcap(trim(o.city)) AS key, COUNT(*)::int AS orders FROM ticket_orders o
      WHERE ${paid} AND NULLIF(trim(o.city), '') IS NOT NULL GROUP BY 1 ORDER BY 2 DESC LIMIT 15
    `,
    sql`SELECT o.age_range AS key, COUNT(*)::int AS orders FROM ticket_orders o WHERE ${paid} GROUP BY 1 ORDER BY 1 NULLS LAST`,
    sql`
      SELECT to_char(o.paid_at AT TIME ZONE 'Europe/London', 'YYYY-MM-DD') AS day, SUM(o.quantity)::int AS tickets
      FROM ticket_orders o WHERE ${paid} GROUP BY 1 ORDER BY 1 DESC LIMIT 60
    `,
  ]);
  const t = totals[0] ?? {};
  return {
    orders: t.orders ?? 0,
    tickets: t.tickets ?? 0,
    revenue_cents: Number(t.revenue ?? 0),
    buyers: t.buyers ?? 0,
    repeat_buyers: t.repeat_buyers ?? 0,
    member_orders: t.member_orders ?? 0,
    marketing_opt_ins: t.opt_ins ?? 0,
    arrived_tickets: t.arrived ?? 0,
    by_type: byType.map((r: any) => ({ name: r.name, tickets: r.tickets, revenue_cents: Number(r.revenue) })),
    by_heard_from: heard as any,
    by_source: source as any,
    by_campaign: campaign as any,
    by_city: city as any,
    by_age: age as any,
    by_day: (day as any[]).reverse(),
  };
}

/** Mark a paid order refunded (the money is refunded in SumUp). First call only. */
export async function markTicketOrderRefunded(orderId: string, reason: string | null, actorId: string | null): Promise<{ ok: true; memberId: string | null } | { ok: false; error: string }> {
  const rows = await sql`
    UPDATE ticket_orders SET status = 'refunded', refunded_at = NOW(), refunded_by = ${actorId}, refund_reason = ${reason}, updated_at = NOW()
    WHERE id = ${orderId} AND status = 'paid'
    RETURNING member_user_id
  `;
  if (rows.length > 0) return { ok: true, memberId: rows[0].member_user_id };
  const current = await sql`SELECT status FROM ticket_orders WHERE id = ${orderId}`;
  if (!current[0]) return { ok: false, error: 'Order not found' };
  return { ok: false, error: current[0].status === 'refunded' ? 'This order has already been refunded' : 'Only paid orders can be refunded' };
}

export async function setOrderArrived(orderId: string, arrived: boolean): Promise<boolean> {
  const rows = await sql`
    UPDATE ticket_orders SET arrived_at = ${arrived ? sql`COALESCE(arrived_at, NOW())` : null}, updated_at = NOW()
    WHERE id = ${orderId} AND status = 'paid' RETURNING id
  `;
  return rows.length > 0;
}
