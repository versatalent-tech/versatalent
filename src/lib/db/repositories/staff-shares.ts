import { sql } from '../client';
import { AGENCY_TIME_ZONE, type EarnerRole, type MyEarning, type StaffShare, type TeamRate } from '@/lib/bookings/types';

// ---------------------------------------------------------------------------
// Managers' and road managers' shares of the agency's commission
// ---------------------------------------------------------------------------

/**
 * Give a booking a share for each active manager and road manager looking
 * after its talent who has a rate, at their rate now. Existing shares are kept.
 * Returned unawaited so it can run in the same transaction as the booking write.
 */
export function staffSharesInsert(bookingId: string) {
  return sql`
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

/**
 * After the booking's talent changes (run in the same transaction, after the
 * booking update): unpaid shares of people who don't look after the new talent
 * go, and the new talent's people get theirs. Paid shares, and shares of people
 * who look after both talents (even if since deactivated), stay.
 */
export function staffSharesForNewTalent(bookingId: string, talentId: string) {
  return [
    sql`
      DELETE FROM booking_staff_shares
      WHERE booking_id = ${bookingId} AND paid_at IS NULL
        AND user_id NOT IN (SELECT user_id FROM talent_assignments WHERE talent_id = ${talentId})
    `,
    staffSharesInsert(bookingId),
  ];
}

/** Remove an unpaid share (e.g. someone linked to the talent by mistake); paid ones must be undone first */
export async function removeStaffShare(bookingId: string, userId: string): Promise<boolean> {
  const rows = await sql`
    DELETE FROM booking_staff_shares WHERE booking_id = ${bookingId} AND user_id = ${userId} AND paid_at IS NULL
    RETURNING booking_id
  `;
  return rows.length > 0;
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

// ---------------------------------------------------------------------------
// Paying shares
// ---------------------------------------------------------------------------

/** The share in cents, from the booking as it is now (agency commission rounded first, like the UI) */
const shareAmount = () => sql`ROUND(ROUND(b.fee_cents * COALESCE(b.commission_percent, 0) / 100) * s.share_percent / 100)::int`;

/** Finished, confirmed or completed, with a fee, a share above 0 and not paid yet */
const owedShare = () => sql`
  s.paid_at IS NULL AND b.fee_cents IS NOT NULL
  AND b.status IN ('confirmed', 'completed') AND b.ends_at <= NOW()
  AND ${shareAmount()} > 0
`;

const shareSelect = () => sql`
  SELECT s.booking_id, s.user_id, u.name AS person_name, u.role, b.title AS booking_title, t.name AS talent_name,
    b.starts_at, b.ends_at, b.currency, s.share_percent, ${shareAmount()} AS amount_cents,
    s.paid_at, s.paid_cents, s.paid_reference
  FROM booking_staff_shares s
  JOIN bookings b ON b.id = s.booking_id
  JOIN users u ON u.id = s.user_id
  JOIN talents t ON t.id = b.talent_id
`;

function mapShare(row: any): StaffShare {
  return {
    booking_id: row.booking_id,
    user_id: row.user_id,
    person_name: row.person_name,
    role: row.role as EarnerRole,
    booking_title: row.booking_title,
    talent_name: row.talent_name,
    starts_at: new Date(row.starts_at).toISOString(),
    ends_at: new Date(row.ends_at).toISOString(),
    currency: row.currency,
    share_percent: Number(row.share_percent),
    amount_cents: row.paid_cents === null ? Number(row.amount_cents ?? 0) : Number(row.paid_cents),
    paid_at: row.paid_at ? new Date(row.paid_at).toISOString() : null,
    paid_cents: row.paid_cents === null ? null : Number(row.paid_cents),
    paid_reference: row.paid_reference,
  };
}

/** Shares owed to the team (by person, oldest booking first) */
export async function listOwedStaffShares(): Promise<StaffShare[]> {
  const rows = await sql`${shareSelect()} WHERE ${owedShare()} ORDER BY u.name, b.starts_at LIMIT 1000`;
  return rows.map(mapShare);
}

/** Shares paid in the last `days` days (newest first) */
export async function listRecentStaffShares(days = 120): Promise<StaffShare[]> {
  const rows = await sql`
    ${shareSelect()} WHERE s.paid_at > NOW() - make_interval(days => ${days})
    ORDER BY s.paid_at DESC, u.name LIMIT 500
  `;
  return rows.map(mapShare);
}

/** Record payment of these shares; only owed ones are marked, at their amount now */
export async function markStaffSharesPaid(
  actor: { userId: string | null },
  shares: { booking_id: string; user_id: string }[],
  paidOn: string, // YYYY-MM-DD, UK date
  reference: string | null
): Promise<StaffShare[]> {
  const bookingIds = shares.map((x) => x.booking_id);
  const userIds = shares.map((x) => x.user_id);
  const marked = await sql`
    UPDATE booking_staff_shares s SET
      paid_at = (${paidOn}::date + TIME '12:00') AT TIME ZONE ${AGENCY_TIME_ZONE},
      paid_cents = ${shareAmount()},
      paid_reference = ${reference},
      paid_by = ${actor.userId}
    FROM bookings b
    WHERE b.id = s.booking_id
      AND (s.booking_id, s.user_id) IN (SELECT * FROM unnest(${bookingIds}::uuid[], ${userIds}::uuid[]))
      AND ${owedShare()}
    RETURNING s.booking_id, s.user_id
  `;
  if (marked.length === 0) return [];
  const rows = await sql`
    ${shareSelect()}
    WHERE (s.booking_id, s.user_id) IN (SELECT * FROM unnest(${marked.map((m: any) => m.booking_id)}::uuid[], ${marked.map((m: any) => m.user_id)}::uuid[]))
  `;
  return rows.map(mapShare);
}

/** Undo a recorded payment (e.g. marked by mistake) */
export async function clearStaffShare(bookingId: string, userId: string): Promise<boolean> {
  const rows = await sql`
    UPDATE booking_staff_shares SET paid_at = NULL, paid_cents = NULL, paid_reference = NULL, paid_by = NULL
    WHERE booking_id = ${bookingId} AND user_id = ${userId} AND paid_at IS NOT NULL
    RETURNING booking_id
  `;
  return rows.length > 0;
}

/** Count and total owed to the team, per currency (dashboard) */
export async function summariseOwedStaffShares(): Promise<{ count: number; totals: { currency: string; cents: number }[] }> {
  const rows = await sql`
    SELECT b.currency, COUNT(*) AS n, SUM(${shareAmount()}) AS cents
    FROM booking_staff_shares s JOIN bookings b ON b.id = s.booking_id
    WHERE ${owedShare()}
    GROUP BY b.currency ORDER BY b.currency
  `;
  return {
    count: rows.reduce((sum: number, row: any) => sum + Number(row.n), 0),
    totals: rows.map((row: any) => ({ currency: row.currency, cents: Number(row.cents) })),
  };
}

// ---------------------------------------------------------------------------
// Your earnings (managers and road managers)
// ---------------------------------------------------------------------------

/** One person's own shares: owed, paid in the last 120 days, and coming up. Never the fee, commission or rate */
export async function listMyEarnings(userId: string): Promise<{ owed: MyEarning[]; paid: MyEarning[]; upcoming: MyEarning[] }> {
  const rows = await sql`
    SELECT s.booking_id, b.title AS booking_title, t.name AS talent_name, b.starts_at, b.ends_at, b.currency,
      COALESCE(s.paid_cents, ${shareAmount()}) AS amount_cents, s.paid_at,
      CASE
        WHEN s.paid_at IS NOT NULL THEN 'paid'
        WHEN ${owedShare()} THEN 'owed'
        ELSE 'upcoming'
      END AS state
    FROM booking_staff_shares s
    JOIN bookings b ON b.id = s.booking_id
    JOIN talents t ON t.id = b.talent_id
    WHERE s.user_id = ${userId}
      AND (
        s.paid_at > NOW() - INTERVAL '120 days'
        OR (s.paid_at IS NULL AND b.status <> 'cancelled' AND ${shareAmount()} > 0
            AND (b.ends_at > NOW() OR b.status IN ('confirmed', 'completed')))
      )
    ORDER BY b.starts_at
    LIMIT 500
  `;
  const result = { owed: [] as MyEarning[], paid: [] as MyEarning[], upcoming: [] as MyEarning[] };
  for (const row of rows as any[]) {
    result[row.state as keyof typeof result].push({
      booking_id: row.booking_id,
      booking_title: row.booking_title,
      talent_name: row.talent_name,
      starts_at: new Date(row.starts_at).toISOString(),
      ends_at: new Date(row.ends_at).toISOString(),
      currency: row.currency,
      amount_cents: Number(row.amount_cents),
      paid_at: row.paid_at ? new Date(row.paid_at).toISOString() : null,
    });
  }
  result.paid.sort((a, b) => b.paid_at!.localeCompare(a.paid_at!));
  return result;
}
