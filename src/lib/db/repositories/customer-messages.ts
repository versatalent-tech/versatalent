import { sql } from '../client';
import {
  DEFAULT_TEMPLATES,
  type MessageChannel,
  type MessageTemplate,
  type PromoEvent,
  type Queue,
  type Stage,
  type TicketMessageCandidate,
  type TicketMessageLogEntry,
} from '@/lib/messages/types';

/**
 * Customer messages (migration 046): queues of ticket buyers to message by
 * hand, the template library, and the log of what was sent.
 */

const iso = (v: unknown): string | null => (v ? new Date(v as string).toISOString() : null);

const londonDate = (d: Date) =>
  new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/London', weekday: 'long', day: 'numeric', month: 'long' }).format(d);
const londonTime = (d: Date) =>
  new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/London', hour: '2-digit', minute: '2-digit' }).format(d);

/** "Venue name, City" from the event's venue */
function venueLine(venue: any): string {
  if (!venue || typeof venue !== 'object') return '';
  return [venue.name, venue.city].filter((p) => typeof p === 'string' && p.trim() !== '').join(', ');
}

function eventValues(origin: string, event: { id: string | null; title: string; start_time: unknown; venue: unknown }): Record<string, string> {
  const start = event.start_time ? new Date(String(iso(event.start_time))) : null;
  return {
    event: event.title,
    event_date: start ? londonDate(start) : '',
    event_time: start ? londonTime(start) : '',
    venue: venueLine(event.venue) || 'the venue',
    tickets_link: event.id ? `${origin}/events/${event.id}/tickets` : `${origin}/events`,
    events_link: `${origin}/events`,
  };
}

// ---------------------------------------------------------------------------
// Templates
// ---------------------------------------------------------------------------

function mapTemplate(r: any): MessageTemplate {
  return {
    id: r.id,
    stage: r.stage,
    name: r.name,
    subject: r.subject ?? null,
    body: r.body,
    is_default: Boolean(r.is_default),
    sort_order: Number(r.sort_order),
    updated_at: iso(r.updated_at)!,
  };
}

/** Add the default texts once (a flag stops them coming back after being deleted) */
async function ensureDefaultTemplates(): Promise<void> {
  const claimed = await sql`
    INSERT INTO programme_settings (key, value) VALUES ('message_templates_seeded', 'true')
    ON CONFLICT (key) DO NOTHING RETURNING key
  `;
  if (claimed.length === 0) return;
  await sql.transaction(
    DEFAULT_TEMPLATES.map(
      (t, i) => sql`
        INSERT INTO message_templates (stage, name, subject, body, is_default, sort_order)
        VALUES (${t.stage}, ${t.name}, ${t.subject}, ${t.body}, ${t.is_default}, ${i})
      `
    )
  );
}

export async function listTemplates(): Promise<MessageTemplate[]> {
  await ensureDefaultTemplates();
  const rows = await sql`SELECT * FROM message_templates ORDER BY stage, is_default DESC, sort_order, name`;
  return rows.map(mapTemplate);
}

export interface TemplateInput {
  stage: Stage;
  name: string;
  subject?: string | null;
  body: string;
  is_default?: boolean;
}

/** Only one default per stage: making one the default clears the others */
async function clearOtherDefaults(stage: Stage, keepId: string) {
  await sql`UPDATE message_templates SET is_default = false WHERE stage = ${stage} AND id <> ${keepId} AND is_default`;
}

export async function createTemplate(input: TemplateInput, userId: string | null): Promise<MessageTemplate> {
  const [{ n }] = await sql`SELECT COUNT(*)::int AS n FROM message_templates WHERE stage = ${input.stage} AND is_default`;
  const makeDefault = Boolean(input.is_default) || n === 0;
  if (makeDefault) await sql`UPDATE message_templates SET is_default = false WHERE stage = ${input.stage} AND is_default`;
  const rows = await sql`
    INSERT INTO message_templates (stage, name, subject, body, is_default, sort_order, created_by, updated_by)
    VALUES (${input.stage}, ${input.name}, ${input.subject || null}, ${input.body}, ${makeDefault},
      (SELECT COALESCE(MAX(sort_order), 0) + 1 FROM message_templates), ${userId}, ${userId})
    RETURNING *
  `;
  return mapTemplate(rows[0]);
}

export async function updateTemplate(id: string, input: TemplateInput, userId: string | null): Promise<MessageTemplate | null> {
  if (input.is_default) await clearOtherDefaults(input.stage, id);
  const rows = await sql`
    UPDATE message_templates SET stage = ${input.stage}, name = ${input.name}, subject = ${input.subject || null}, body = ${input.body},
      is_default = COALESCE(${input.is_default ?? null}::boolean, is_default), updated_by = ${userId}, updated_at = NOW()
    WHERE id = ${id}
    RETURNING *
  `;
  return rows[0] ? mapTemplate(rows[0]) : null;
}

export async function deleteTemplate(id: string): Promise<boolean> {
  const rows = await sql`DELETE FROM message_templates WHERE id = ${id} RETURNING stage, is_default`;
  if (!rows[0]) return false;
  // Keep a default for the stage if there are others left
  if (rows[0].is_default) {
    await sql`
      UPDATE message_templates SET is_default = true
      WHERE id = (SELECT id FROM message_templates WHERE stage = ${rows[0].stage} ORDER BY sort_order, name LIMIT 1)
    `;
  }
  return true;
}

// ---------------------------------------------------------------------------
// Ticket buyer queues
// ---------------------------------------------------------------------------

/** When an event is over: its end time, or 6 hours after it starts */
const eventEnd = sql`COALESCE(e.end_time, e.start_time + INTERVAL '6 hours')`;

function queueFilter(queue: Queue) {
  switch (queue) {
    case 'confirmation':
      return sql`o.paid_at > NOW() - INTERVAL '30 days' AND (e.id IS NULL OR ${eventEnd} > NOW())`;
    case 'reminder':
      return sql`e.start_time > NOW() AND e.start_time <= NOW() + INTERVAL '3 days'`;
    case 'follow_up':
      return sql`${eventEnd} <= NOW() AND ${eventEnd} > NOW() - INTERVAL '14 days'`;
  }
}

export async function listQueue(queue: Queue, origin: string, eventId: string | null = null): Promise<TicketMessageCandidate[]> {
  const rows = await sql`
    SELECT o.id, o.reference, o.access_token, o.first_name, o.last_name, o.email, o.phone, o.instagram, o.quantity,
      o.marketing_consent, o.pdf_key, o.event_id, COALESCE(e.title, o.event_title) AS event_title, e.start_time, e.venue,
      (SELECT string_agg(i.quantity || ' × ' || i.name, ', ' ORDER BY i.name) FROM ticket_order_items i WHERE i.order_id = o.id) AS items,
      (EXISTS (SELECT 1 FROM tickets t WHERE t.order_id = o.id AND t.admitted_at IS NOT NULL) OR o.arrived_at IS NOT NULL) AS attended
    FROM ticket_orders o LEFT JOIN events e ON e.id = o.event_id
    WHERE o.status = 'paid' AND ${queueFilter(queue)}
      AND (${eventId}::uuid IS NULL OR o.event_id = ${eventId}::uuid)
      AND NOT EXISTS (SELECT 1 FROM ticket_message_log l WHERE l.order_id = o.id AND l.queue = ${queue})
    ORDER BY e.start_time NULLS LAST, o.paid_at
    LIMIT 500
  `;
  return rows.map((r: any) => {
    const attended = Boolean(r.attended);
    return {
      order_id: r.id,
      reference: r.reference,
      name: `${r.first_name} ${r.last_name}`.trim(),
      email: r.email,
      phone: r.phone,
      instagram: r.instagram,
      event_id: r.event_id,
      event_title: r.event_title,
      event_starts_at: iso(r.start_time),
      tickets: r.items ?? `${r.quantity} tickets`,
      marketing_consent: Boolean(r.marketing_consent),
      has_pdf: Boolean(r.pdf_key),
      attended,
      suggested_stage: queue === 'confirmation' ? 'ticket_confirmation' : queue === 'reminder' ? 'event_reminder' : attended ? 'post_event' : 'post_event_no_show',
      values: {
        first_name: r.first_name,
        last_name: r.last_name,
        reference: r.reference,
        quantity: String(r.quantity),
        tickets: r.items ?? `${r.quantity} tickets`,
        order_link: `${origin}/tickets/order/${r.id}?k=${encodeURIComponent(r.access_token)}`,
        ...eventValues(origin, { id: r.event_id, title: r.event_title, start_time: r.start_time, venue: r.venue }),
      },
    };
  });
}

/** How many are waiting in each queue (tabs and the dashboard) */
export async function countQueues(): Promise<Record<Queue, number>> {
  const count = (queue: Queue) => sql`
    SELECT COUNT(*)::int AS n FROM ticket_orders o LEFT JOIN events e ON e.id = o.event_id
    WHERE o.status = 'paid' AND ${queueFilter(queue)}
      AND NOT EXISTS (SELECT 1 FROM ticket_message_log l WHERE l.order_id = o.id AND l.queue = ${queue})
  `;
  const [c, r, f] = await Promise.all([count('confirmation'), count('reminder'), count('follow_up')]);
  return { confirmation: c[0].n, reminder: r[0].n, follow_up: f[0].n };
}

/** Record messages sent by hand. An order already marked for this queue isn't recorded twice. */
export async function logTicketMessages(
  orderIds: string[],
  queue: Queue,
  channel: MessageChannel,
  templateId: string | null,
  actorId: string | null
): Promise<number> {
  if (orderIds.length === 0) return 0;
  const rows = await sql`
    INSERT INTO ticket_message_log (order_id, queue, template_id, channel, sent_by)
    SELECT o.id, ${queue}, ${templateId}::uuid, ${channel}, ${actorId}::uuid
    FROM ticket_orders o WHERE o.id = ANY(${orderIds}::uuid[])
    ON CONFLICT (order_id, queue) DO NOTHING
    RETURNING id
  `;
  return rows.length;
}

/** Undo a mark (it goes back on the list) */
export async function deleteTicketMessage(id: string): Promise<boolean> {
  const rows = await sql`DELETE FROM ticket_message_log WHERE id = ${id} RETURNING id`;
  return rows.length > 0;
}

export async function listTicketMessageLog(limit = 200): Promise<TicketMessageLogEntry[]> {
  const rows = await sql`
    SELECT l.*, o.reference, o.first_name, o.last_name, o.event_title, t.name AS template_name, s.name AS sent_by_name
    FROM ticket_message_log l
    JOIN ticket_orders o ON o.id = l.order_id
    LEFT JOIN message_templates t ON t.id = l.template_id
    LEFT JOIN users s ON s.id = l.sent_by
    ORDER BY l.created_at DESC LIMIT ${limit}
  `;
  return rows.map((r: any) => ({
    id: r.id,
    order_id: r.order_id,
    reference: r.reference,
    name: `${r.first_name} ${r.last_name}`.trim(),
    event_title: r.event_title,
    queue: r.queue,
    template_name: r.template_name ?? null,
    channel: r.channel,
    sent_by_name: r.sent_by_name ?? null,
    created_at: iso(r.created_at)!,
  }));
}

// ---------------------------------------------------------------------------
// Promotion
// ---------------------------------------------------------------------------

/** Upcoming events to promote, with their placeholder values */
export async function listPromoEvents(origin: string): Promise<Omit<PromoEvent, 'past_buyer_emails'>[]> {
  const rows = await sql`
    SELECT e.id, e.title, e.start_time, e.venue FROM events e
    WHERE e.start_time > NOW() - INTERVAL '1 day' AND COALESCE(e.status, '') NOT IN ('cancelled', 'completed')
    ORDER BY e.start_time
    LIMIT 50
  `;
  return rows.map((r: any) => ({ id: r.id, title: r.title, starts_at: iso(r.start_time)!, values: eventValues(origin, { id: r.id, title: r.title, start_time: r.start_time, venue: r.venue }) }));
}

/**
 * Emails of people who bought tickets before, agreed to marketing on their
 * latest order, and haven't bought for this event yet.
 */
export async function pastBuyerEmails(eventId: string): Promise<string[]> {
  const rows = await sql`
    SELECT latest.email FROM (
      SELECT DISTINCT ON (lower(o.email)) lower(o.email) AS email, o.marketing_consent
      FROM ticket_orders o WHERE o.status IN ('paid', 'refunded')
      ORDER BY lower(o.email), o.created_at DESC
    ) latest
    WHERE latest.marketing_consent
      AND NOT EXISTS (SELECT 1 FROM ticket_orders p WHERE lower(p.email) = latest.email AND p.event_id = ${eventId} AND p.status = 'paid')
    ORDER BY latest.email
  `;
  return rows.map((r: any) => r.email);
}
