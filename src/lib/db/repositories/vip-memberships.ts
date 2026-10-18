import { sql } from '../client';
import type { VIPMembership, VIPMembershipWithUser, UpdateVIPMembershipRequest, VIPTier } from '../types';

/** DATE columns may arrive as Date objects (at local midnight) or strings */
function dateOnly(value: unknown): string {
  if (value instanceof Date) {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`;
  }
  return String(value).slice(0, 10);
}

function normalize<T extends VIPMembership>(row: T): T {
  return row ? { ...row, year_start: dateOnly(row.year_start) } : row;
}

export async function getAllVIPMemberships(): Promise<VIPMembershipWithUser[]> {
  const memberships = await sql<(VIPMembership & {
    user_name: string;
    user_email: string;
    user_role: string;
    user_avatar_url?: string;
  })[]>`
    SELECT
      vip_memberships.*,
      users.name as user_name,
      users.email as user_email,
      users.role as user_role,
      users.avatar_url as user_avatar_url
    FROM vip_memberships
    LEFT JOIN users ON vip_memberships.user_id = users.id
    ORDER BY vip_memberships.lifetime_points DESC
  `;

  return memberships.map(m => ({
    ...normalize(m),
    user: {
      id: m.user_id,
      name: m.user_name,
      email: m.user_email,
      role: m.user_role as any,
      avatar_url: m.user_avatar_url,
      created_at: new Date(),
      updated_at: new Date()
    }
  }));
}

export async function getVIPMembershipByUserId(userId: string): Promise<VIPMembership | null> {
  const memberships = await sql<VIPMembership[]>`
    SELECT * FROM vip_memberships WHERE user_id = ${userId} LIMIT 1
  `;
  return memberships[0] ? normalize(memberships[0]) : null;
}

export async function getVIPMembershipById(id: string): Promise<VIPMembership | null> {
  const memberships = await sql<VIPMembership[]>`
    SELECT * FROM vip_memberships WHERE id = ${id} LIMIT 1
  `;
  return memberships[0] ? normalize(memberships[0]) : null;
}

/**
 * Create a Silver membership. The membership year runs from the anniversary
 * of the day the member joined (their user account was created).
 */
export async function createVIPMembership(userId: string): Promise<VIPMembership> {
  const memberships = await sql<VIPMembership[]>`
    INSERT INTO vip_memberships (user_id, tier, base_tier, points_balance, lifetime_points, status_points, status, year_start)
    SELECT
      ${userId}, 'silver', 'silver', 0, 0, 0, 'active',
      (j.joined + make_interval(years => EXTRACT(YEAR FROM age((NOW() AT TIME ZONE 'Europe/London')::date, j.joined))::int))::date
    FROM (
      SELECT COALESCE(
        (SELECT (created_at AT TIME ZONE 'Europe/London')::date FROM users WHERE id = ${userId}),
        (NOW() AT TIME ZONE 'Europe/London')::date
      ) AS joined
    ) j
    ON CONFLICT (user_id) DO UPDATE
    SET updated_at = CURRENT_TIMESTAMP
    RETURNING *
  `;
  return normalize(memberships[0]);
}

export async function updateVIPMembership(
  userId: string,
  data: UpdateVIPMembershipRequest
): Promise<VIPMembership> {
  const updates: string[] = [];
  const values: any[] = [];
  let paramIndex = 1;

  if (data.tier !== undefined) {
    // An admin-set tier is secured for the rest of the membership year
    updates.push(`tier = $${paramIndex}, base_tier = $${paramIndex}`);
    paramIndex++;
    values.push(data.tier);
  }
  if (data.status !== undefined) {
    updates.push(`status = $${paramIndex++}`);
    values.push(data.status);
  }
  // Balances only change through the points ledger (repositories/loyalty.ts)

  if (updates.length === 0) {
    throw new Error('No fields to update');
  }

  values.push(userId);
  const query = `
    UPDATE vip_memberships
    SET ${updates.join(', ')}
    WHERE user_id = $${paramIndex}
    RETURNING *
  `;

  // Dynamic SQL: neon 1.x only accepts sql`...` templates when called directly
  const memberships = (await sql.query(query, values)) as VIPMembership[];
  return normalize(memberships[0]);
}

export async function setMembershipTier(userId: string, tier: VIPTier): Promise<void> {
  await sql`UPDATE vip_memberships SET tier = ${tier} WHERE user_id = ${userId}`;
}

/** Memberships whose year has ended, with how many years have ended */
export async function getMembershipsDueForNewYear(userId?: string): Promise<Array<{
  user_id: string;
  tier: VIPTier;
  base_tier: VIPTier;
  status_points: number;
  year_start: string;
  years_ended: number;
}>> {
  const rows = userId
    ? await sql`
        SELECT user_id, tier, base_tier, status_points, year_start::text AS year_start,
               EXTRACT(YEAR FROM age((NOW() AT TIME ZONE 'Europe/London')::date, year_start))::int AS years_ended
        FROM vip_memberships
        WHERE user_id = ${userId}
          AND year_start + INTERVAL '1 year' <= (NOW() AT TIME ZONE 'Europe/London')::date
      `
    : await sql`
        SELECT user_id, tier, base_tier, status_points, year_start::text AS year_start,
               EXTRACT(YEAR FROM age((NOW() AT TIME ZONE 'Europe/London')::date, year_start))::int AS years_ended
        FROM vip_memberships
        WHERE year_start + INTERVAL '1 year' <= (NOW() AT TIME ZONE 'Europe/London')::date
      `;
  return rows as any;
}

// Starting a new membership year: see loyalty_start_year (repositories/loyalty.ts)

export async function getVIPMembershipsByTier(tier: string): Promise<VIPMembership[]> {
  const memberships = await sql<VIPMembership[]>`
    SELECT * FROM vip_memberships
    WHERE tier = ${tier} AND status = 'active'
    ORDER BY points_balance DESC
  `;
  return memberships.map(normalize);
}

export async function getVIPLeaderboard(limit = 10): Promise<VIPMembershipWithUser[]> {
  const memberships = await sql<(VIPMembership & {
    user_name: string;
    user_email: string;
  })[]>`
    SELECT
      vip_memberships.*,
      users.name as user_name,
      users.email as user_email
    FROM vip_memberships
    LEFT JOIN users ON vip_memberships.user_id = users.id
    WHERE vip_memberships.status = 'active'
    ORDER BY vip_memberships.lifetime_points DESC
    LIMIT ${limit}
  `;

  return memberships.map(m => ({
    ...normalize(m),
    user: {
      id: m.user_id,
      name: m.user_name,
      email: m.user_email,
      role: 'vip' as any,
      created_at: new Date(),
      updated_at: new Date()
    }
  }));
}
