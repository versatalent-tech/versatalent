import { sql } from '../client';
import type { EarnerRole, TeamRate } from '@/lib/bookings/types';

// ---------------------------------------------------------------------------
// Managers' and road managers' shares of the agency's commission
// ---------------------------------------------------------------------------

/**
 * Give a booking a share for each active manager and road manager looking
 * after its talent who has a rate, at their rate now. Existing shares are kept.
 */
export async function addStaffShares(bookingId: string): Promise<void> {
  await sql`
    INSERT INTO booking_staff_shares (booking_id, user_id, share_percent)
    SELECT b.id, u.id, u.share_percent
    FROM bookings b
    JOIN talent_assignments ta ON ta.talent_id = b.talent_id
    JOIN users u ON u.id = ta.user_id
    WHERE b.id = ${bookingId}
      AND u.is_active AND u.role IN ('manager', 'road_manager') AND u.share_percent IS NOT NULL
    ON CONFLICT (booking_id, user_id) DO NOTHING
  `;
}

/** After the booking's talent changes: unpaid shares go to the new talent's people; paid ones stay */
export async function replaceUnpaidStaffShares(bookingId: string): Promise<void> {
  await sql`DELETE FROM booking_staff_shares WHERE booking_id = ${bookingId} AND paid_at IS NULL`;
  await addStaffShares(bookingId);
}

// ---------------------------------------------------------------------------
// Team rates
// ---------------------------------------------------------------------------

/** Managers and road managers with their rate and talents; talents whose people add up to over 100% */
export async function listTeamRates(): Promise<{ people: TeamRate[]; overLimit: { talent: string; percent: number }[] }> {
  const people = await sql`
    SELECT u.id, u.name, u.role, u.is_active, u.share_percent,
      COALESCE(array_agg(t.name ORDER BY t.name) FILTER (WHERE t.id IS NOT NULL), '{}') AS talents
    FROM users u
    LEFT JOIN talent_assignments ta ON ta.user_id = u.id
    LEFT JOIN talents t ON t.id = ta.talent_id
    WHERE u.role IN ('manager', 'road_manager')
    GROUP BY u.id
    ORDER BY u.is_active DESC, u.name
  `;
  const over = await sql`
    SELECT t.name, SUM(u.share_percent) AS percent
    FROM talent_assignments ta
    JOIN users u ON u.id = ta.user_id
    JOIN talents t ON t.id = ta.talent_id
    WHERE u.is_active AND u.role IN ('manager', 'road_manager') AND u.share_percent IS NOT NULL
    GROUP BY t.id, t.name
    HAVING SUM(u.share_percent) > 100
    ORDER BY t.name
  `;
  return {
    people: people.map((row: any) => ({
      id: row.id,
      name: row.name,
      role: row.role as EarnerRole,
      is_active: row.is_active,
      share_percent: row.share_percent === null ? null : Number(row.share_percent),
      talents: row.talents,
    })),
    overLimit: over.map((row: any) => ({ talent: row.name, percent: Number(row.percent) })),
  };
}

/**
 * Set managers' and road managers' rates (other roles are ignored). People
 * getting a rate for the first time also get a share on their talents'
 * bookings that aren't cancelled or paid to the talent yet. Returns their ids.
 */
export async function setTeamRates(rates: { user_id: string; share_percent: number | null }[]): Promise<string[]> {
  if (rates.length === 0) return [];
  const ids = rates.map((r) => r.user_id);
  const before = await sql`SELECT id FROM users WHERE id = ANY(${ids}::uuid[]) AND role IN ('manager', 'road_manager') AND share_percent IS NULL`;
  const wasUnset = new Set(before.map((row: any) => row.id as string));
  await sql.transaction(
    rates.map(
      (r) => sql`UPDATE users SET share_percent = ${r.share_percent} WHERE id = ${r.user_id} AND role IN ('manager', 'road_manager')`
    )
  );
  const firstSet = rates.filter((r) => r.share_percent !== null && wasUnset.has(r.user_id)).map((r) => r.user_id);
  if (firstSet.length > 0) {
    await sql`
      INSERT INTO booking_staff_shares (booking_id, user_id, share_percent)
      SELECT b.id, u.id, u.share_percent
      FROM users u
      JOIN talent_assignments ta ON ta.user_id = u.id
      JOIN bookings b ON b.talent_id = ta.talent_id
      WHERE u.id = ANY(${firstSet}::uuid[]) AND u.is_active
        AND b.status <> 'cancelled' AND b.talent_paid_at IS NULL
      ON CONFLICT (booking_id, user_id) DO NOTHING
    `;
  }
  return firstSet;
}
