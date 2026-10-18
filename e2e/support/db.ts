/**
 * Direct database access for setting up test data and checking results.
 * Every helper makes new rows with unique names, so tests don't depend on
 * each other or on the live data the copy started with.
 */
import { neon } from '@neondatabase/serverless';
import { randomUUID } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { DATABASE_URL } from './env';

export const sql = neon(DATABASE_URL);

export const uniq = (prefix = 'e2e') => `${prefix}-${randomUUID().slice(0, 8)}`;
const daysFromNow = (days: number) => new Date(Date.now() + days * 86_400_000).toISOString();

export async function createEvent(opts: { title?: string; startsInDays?: number; hours?: number; talentIds?: string[]; status?: string; published?: boolean } = {}) {
  const id = randomUUID();
  const title = opts.title ?? uniq('E2E Event');
  const start = daysFromNow(opts.startsInDays ?? 14);
  const end = new Date(new Date(start).getTime() + (opts.hours ?? 5) * 3_600_000).toISOString();
  await sql`
    INSERT INTO events (id, title, slug, description, type, status, start_time, end_time, venue, talent_ids, is_published)
    VALUES (${id}, ${title}, ${id}, 'Test event', 'performance', ${opts.status ?? 'upcoming'}, ${start}, ${end},
      ${JSON.stringify({ name: 'E2E Venue', city: 'Leeds' })}::jsonb, ${(opts.talentIds ?? []).map(String)}::text[], ${opts.published ?? true})
  `;
  return { id, title };
}

export async function createTicketType(eventId: string, opts: { name?: string; priceCents?: number; capacity?: number | null; maxPerOrder?: number; salesStartInDays?: number } = {}) {
  const id = randomUUID();
  await sql`
    INSERT INTO ticket_types (id, event_id, name, price_cents, capacity, max_per_order, sales_start)
    VALUES (${id}, ${eventId}, ${opts.name ?? 'General admission'}, ${opts.priceCents ?? 1500},
      ${opts.capacity === undefined ? null : opts.capacity}, ${opts.maxPerOrder ?? 6},
      ${opts.salesStartInDays === undefined ? null : daysFromNow(opts.salesStartInDays)})
  `;
  return { id };
}

/** A VIP member (with a membership row) */
export async function createMember(opts: { tier?: 'silver' | 'gold' | 'black' } = {}) {
  const id = randomUUID();
  const email = `${uniq('member')}@example.com`;
  await sql`INSERT INTO users (id, name, email, role) VALUES (${id}, 'E2E Member', ${email}, 'vip')`;
  await sql`
    INSERT INTO vip_memberships (user_id, tier, base_tier) VALUES (${id}, ${opts.tier ?? 'silver'}, ${opts.tier ?? 'silver'})
    ON CONFLICT (user_id) DO NOTHING
  `;
  return { id, email };
}

/** A team login (manager or road manager) with a known password */
export async function createTeamUser(role: 'manager' | 'road_manager', talentIds: string[] = []) {
  const id = randomUUID();
  const email = `${uniq(role.replace('_', '-'))}@example.com`;
  const password = `E2e-${randomUUID()}`;
  await sql`
    INSERT INTO users (id, name, email, role, password_hash, is_active)
    VALUES (${id}, ${`E2E ${role}`}, ${email}, ${role}, ${await bcrypt.hash(password, 10)}, true)
  `;
  for (const talentId of talentIds) {
    await sql`INSERT INTO talent_assignments (user_id, talent_id) VALUES (${id}, ${talentId})`;
  }
  return { id, email, password };
}

/** A talent's portal login (an 'artist' user linked to the talent) with a known password */
export async function createTalentLogin(talentId: string, name = uniq('E2E Artist')) {
  const id = randomUUID();
  const email = `${uniq('artist')}@example.com`;
  const password = `E2e-${randomUUID()}`;
  await sql`
    INSERT INTO users (id, name, email, role, talent_id, password_hash, is_active)
    VALUES (${id}, ${name}, ${email}, 'artist', ${talentId}, ${await bcrypt.hash(password, 10)}, true)
  `;
  return { id, name, email, password };
}

export async function createTalent(opts: { name?: string; active?: boolean } = {}) {
  const id = randomUUID();
  const name = opts.name ?? uniq('E2E Talent');
  await sql`
    INSERT INTO talents (id, name, industry, gender, age_group, profession, location, bio, tagline, skills, image_src, is_active)
    VALUES (${id}, ${name}, 'music', 'male', 'adult', 'DJ', 'Leeds, UK', 'Test bio', 'Test tagline', ARRAY['Testing'],
      '/deejaywg/IMG_8999.jpg', ${opts.active ?? true})
  `;
  return { id, name };
}

export async function createOrganisation(name = uniq('E2E Client')) {
  const rows = await sql`INSERT INTO organisations (name) VALUES (${name}) RETURNING id`;
  return { id: rows[0].id as string, name };
}

export async function createBooking(talentId: string, opts: { status?: string; endedDaysAgo?: number; startsInDays?: number; organisationId?: string | null; eventId?: string | null } = {}) {
  const start = opts.startsInDays !== undefined ? daysFromNow(opts.startsInDays) : daysFromNow(-(opts.endedDaysAgo ?? 3) - 0.2);
  const end = new Date(new Date(start).getTime() + 4 * 3_600_000).toISOString();
  const rows = await sql`
    INSERT INTO bookings (talent_id, organisation_id, event_id, title, status, starts_at, ends_at)
    VALUES (${talentId}, ${opts.organisationId ?? null}, ${opts.eventId ?? null}, ${uniq('E2E Booking')}, ${opts.status ?? 'completed'}, ${start}, ${end})
    RETURNING id
  `;
  return { id: rows[0].id as string };
}

/** Reward and status balances, and ledger entries, for a member */
export async function pointsFor(userId: string) {
  const [m] = await sql`SELECT points_balance, status_points, tier FROM vip_memberships WHERE user_id = ${userId}`;
  const log = await sql`SELECT ledger, source, source_key, delta_points FROM vip_points_log WHERE user_id = ${userId} ORDER BY created_at, ledger`;
  return { reward: Number(m?.points_balance ?? 0), status: Number(m?.status_points ?? 0), tier: m?.tier as string, log };
}

export async function ticketOrder(orderId: string) {
  const [row] = await sql`SELECT * FROM ticket_orders WHERE id = ${orderId}`;
  return row;
}
