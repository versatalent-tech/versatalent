/**
 * Working out the KPIs for a period, straight from the records.
 *
 * Relative imports only: the nightly snapshot (netlify/functions/
 * kpi-snapshots.mts) bundles this outside Next.js.
 *
 * Periods are [from, to) calendar days in UK time. Scope follows the CRM:
 * admins (all) see the whole agency; a manager's figures cover deals they
 * own or created or that involve their talents, bookings and utilisation of
 * their talents, and prospecting contacts they own. Money is GBP only.
 */
import { sql } from '../db/client';
import type { KpiValues, TalentUtilisation } from './types';

export interface KpiScope {
  all: boolean;
  userId: string | null;
  talentIds: string[];
}

export interface KpiComputation {
  values: KpiValues;
  leads_by_source: { source: string; count: number }[];
  utilisation: TalentUtilisation[];
}

const num = (value: unknown): number | null => (value === null || value === undefined ? null : Number(value));
const pct = (part: number, whole: number): number | null => (whole > 0 ? (part / whole) * 100 : null);

/** First day of the month, YYYY-MM-DD */
export function monthStart(date: Date): string {
  const d = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/London', year: 'numeric', month: '2-digit' }).format(date);
  return `${d}-01`;
}

/** YYYY-MM-DD plus n months */
export function addMonths(day: string, n: number): string {
  const [y, m] = day.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 1 + n, 1));
  return d.toISOString().slice(0, 10);
}

export async function computeKpis(
  scope: KpiScope,
  from: string,
  to: string,
  options: { membership: boolean }
): Promise<KpiComputation> {
  const F = sql`(${from}::date::timestamp AT TIME ZONE 'Europe/London')`;
  const T = sql`(${to}::date::timestamp AT TIME ZONE 'Europe/London')`;
  const talentIds = scope.talentIds;
  const dealVisible = scope.all
    ? sql`TRUE`
    : sql`(d.owner_user_id = ${scope.userId} OR d.created_by = ${scope.userId} OR d.talent_ids && ${talentIds}::uuid[])`;
  const bookingVisible = scope.all ? sql`TRUE` : sql`b.talent_id = ANY(${talentIds}::uuid[])`;
  const enrolmentVisible = scope.all ? sql`TRUE` : sql`e.owner_user_id = ${scope.userId}`;
  const meetingVisible = scope.all ? sql`TRUE` : sql`(m.created_by = ${scope.userId} OR m.talent_ids && ${talentIds}::uuid[])`;
  const talentVisible = scope.all ? sql`TRUE` : sql`t.id = ANY(${talentIds}::uuid[])`;

  const wonInPeriod = sql`d.stage = 'won' AND d.closed_at >= ${F} AND d.closed_at < ${T}`;

  const [sales, sources, repeat, response, outreach, meetings, bookings, utilisation, membership] = await Promise.all([
    sql`
      SELECT
        COUNT(*) FILTER (WHERE d.created_at >= ${F} AND d.created_at < ${T}) AS new_leads,
        COUNT(*) FILTER (WHERE ${wonInPeriod}) AS won,
        COUNT(*) FILTER (WHERE d.stage = 'lost' AND d.closed_at >= ${F} AND d.closed_at < ${T}) AS lost,
        AVG(d.value_cents) FILTER (WHERE ${wonInPeriod} AND d.currency = 'GBP' AND d.value_cents IS NOT NULL) AS avg_value,
        PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY GREATEST(0, EXTRACT(EPOCH FROM d.closed_at - d.created_at) / 86400))
          FILTER (WHERE ${wonInPeriod}) AS cycle_days,
        SUM(d.value_cents * CASE d.stage WHEN 'lead' THEN 0.1 WHEN 'qualified' THEN 0.25 WHEN 'proposal' THEN 0.5 WHEN 'negotiation' THEN 0.75 ELSE 0 END)
          FILTER (WHERE d.currency = 'GBP') AS weighted
      FROM deals d WHERE ${dealVisible}
    `,
    sql`
      SELECT d.source, COUNT(*)::int AS count FROM deals d
      WHERE ${dealVisible} AND d.created_at >= ${F} AND d.created_at < ${T}
      GROUP BY d.source ORDER BY count DESC
    `,
    sql`
      SELECT
        COUNT(*) AS won_with_client,
        COUNT(*) FILTER (WHERE EXISTS (
          SELECT 1 FROM deals d2 WHERE d2.organisation_id = d.organisation_id AND d2.stage = 'won' AND d2.closed_at < d.closed_at
        )) AS repeat
      FROM deals d WHERE ${dealVisible} AND ${wonInPeriod} AND d.organisation_id IS NOT NULL
    `,
    sql`
      SELECT PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY GREATEST(0, EXTRACT(EPOCH FROM q.handled_at - q.created_at) / 3600)) AS hours
      FROM enquiries q
      WHERE q.created_at >= ${F} AND q.created_at < ${T} AND q.handled_at IS NOT NULL AND q.status <> 'spam'
    `,
    sql`
      SELECT
        COUNT(*) FILTER (WHERE e.first_contacted_at >= ${F} AND e.first_contacted_at < ${T}) AS contacted,
        COUNT(*) FILTER (WHERE e.first_contacted_at >= ${F} AND e.first_contacted_at < ${T} AND e.status IN ('replied', 'meeting')) AS replied,
        COUNT(*) FILTER (WHERE e.status = 'meeting' AND e.status_changed_at >= ${F} AND e.status_changed_at < ${T}) AS meetings
      FROM prospect_enrolments e WHERE ${enrolmentVisible}
    `,
    sql`SELECT COUNT(*) AS held FROM meetings m WHERE ${meetingVisible} AND m.starts_at >= ${F} AND m.starts_at < ${T}`,
    sql`
      SELECT
        COUNT(*) FILTER (WHERE b.status IN ('confirmed', 'completed') AND b.starts_at >= ${F} AND b.starts_at < ${T}) AS confirmed,
        SUM(b.fee_cents) FILTER (WHERE b.status IN ('confirmed', 'completed') AND b.starts_at >= ${F} AND b.starts_at < ${T} AND b.currency = 'GBP') AS value,
        SUM(b.fee_cents * COALESCE(b.commission_percent, 0) / 100.0)
          FILTER (WHERE b.status IN ('confirmed', 'completed') AND b.ends_at >= ${F} AND b.ends_at < ${T} AND b.currency = 'GBP') AS commission,
        COUNT(*) FILTER (WHERE b.status = 'cancelled' AND b.starts_at >= ${F} AND b.starts_at < ${T}) AS cancelled,
        COUNT(*) FILTER (WHERE b.status IN ('confirmed', 'completed', 'cancelled') AND b.starts_at >= ${F} AND b.starts_at < ${T}) AS decided
      FROM bookings b WHERE ${bookingVisible}
    `,
    sql`
      WITH days AS (
        SELECT generate_series(${from}::date, ${to}::date - 1, interval '1 day')::date AS day
      ),
      grid AS (
        SELECT t.id, t.name, days.day FROM talents t CROSS JOIN days WHERE t.is_active AND ${talentVisible}
      ),
      flags AS (
        SELECT g.id, g.name,
          EXISTS (
            SELECT 1 FROM bookings b WHERE b.talent_id = g.id AND b.status IN ('confirmed', 'completed')
              AND (b.starts_at AT TIME ZONE 'Europe/London')::date <= g.day AND (b.ends_at AT TIME ZONE 'Europe/London')::date >= g.day
          ) AS booked,
          EXISTS (
            SELECT 1 FROM talent_availability a WHERE a.talent_id = g.id AND a.kind = 'unavailable' AND a.starts_on <= g.day AND a.ends_on >= g.day
          ) AS unavailable
        FROM grid g
      )
      SELECT id, name,
        COUNT(*) FILTER (WHERE booked)::int AS booked_days,
        COUNT(*) FILTER (WHERE booked OR NOT unavailable)::int AS available_days
      FROM flags GROUP BY id, name ORDER BY name
    `,
    options.membership
      ? sql`
          SELECT
            (SELECT COUNT(*) FROM vip_memberships WHERE created_at >= ${F} AND created_at < ${T}) AS new_members,
            (SELECT COUNT(*) FROM checkins WHERE timestamp >= ${F} AND timestamp < ${T}) AS checkins,
            (SELECT SUM(total_cents) FROM pos_orders
              WHERE status = 'paid' AND refunded_at IS NULL AND customer_user_id IS NOT NULL
                AND created_at >= ${F} AND created_at < ${T}) AS member_spend,
            (SELECT COUNT(*) FROM paid_memberships WHERE paid_at >= ${F} AND paid_at < ${T}) AS founding_sold
        `
      : Promise.resolve([] as any[]),
  ]);

  const s = sales[0] ?? {};
  const won = Number(s.won ?? 0);
  const lost = Number(s.lost ?? 0);
  const r = repeat[0] ?? {};
  const o = outreach[0] ?? {};
  const b = bookings[0] ?? {};
  const m = membership[0];
  const util: TalentUtilisation[] = utilisation.map((row: any) => ({
    talent: { id: row.id, name: row.name },
    booked_days: row.booked_days,
    available_days: row.available_days,
    rate: pct(row.booked_days, row.available_days),
  }));
  const bookedTotal = util.reduce((sum, u) => sum + u.booked_days, 0);
  const availableTotal = util.reduce((sum, u) => sum + u.available_days, 0);

  const values: KpiValues = {
    new_leads: Number(s.new_leads ?? 0),
    win_rate: pct(won, won + lost),
    weighted_pipeline: num(s.weighted) ?? 0,
    avg_deal_value: num(s.avg_value),
    sales_cycle_days: num(s.cycle_days),
    repeat_client_rate: pct(Number(r.repeat ?? 0), Number(r.won_with_client ?? 0)),
    first_response_hours: num(response[0]?.hours),
    outreach_contacted: Number(o.contacted ?? 0),
    outreach_reply_rate: pct(Number(o.replied ?? 0), Number(o.contacted ?? 0)),
    meetings_booked: Number(o.meetings ?? 0),
    meetings_held: Number(meetings[0]?.held ?? 0),
    bookings_confirmed: Number(b.confirmed ?? 0),
    bookings_value: num(b.value) ?? 0,
    commission: num(b.commission) ?? 0,
    utilisation: pct(bookedTotal, availableTotal),
    cancellation_rate: pct(Number(b.cancelled ?? 0), Number(b.decided ?? 0)),
  };
  if (m) {
    values.new_members = Number(m.new_members ?? 0);
    values.member_checkins = Number(m.checkins ?? 0);
    values.member_spend = num(m.member_spend) ?? 0;
    values.founding_sold = Number(m.founding_sold ?? 0);
  }

  return {
    values,
    leads_by_source: sources.map((row: any) => ({ source: row.source, count: row.count })),
    utilisation: util,
  };
}

/** Save a month's agency-wide figures (used by the nightly snapshot) */
export async function saveSnapshot(month: string): Promise<void> {
  const { values } = await computeKpis({ all: true, userId: null, talentIds: [] }, month, addMonths(month, 1), { membership: true });
  const entries = Object.entries(values);
  await sql.transaction(
    entries.map(
      ([metric, value]) => sql`
        INSERT INTO kpi_snapshots (metric, month, value, computed_at) VALUES (${metric}, ${month}, ${value}, NOW())
        ON CONFLICT (metric, month) DO UPDATE SET value = EXCLUDED.value, computed_at = NOW()
      `
    )
  );
}

/** Saved monthly figures, keyed by month then metric */
export async function loadSnapshots(fromMonth: string, toMonth: string): Promise<Record<string, KpiValues>> {
  const rows = await sql`
    SELECT metric, month::text AS month, value FROM kpi_snapshots WHERE month >= ${fromMonth}::date AND month <= ${toMonth}::date
  `;
  const out: Record<string, KpiValues> = {};
  for (const row of rows as any[]) {
    const key = String(row.month).slice(0, 10);
    out[key] = out[key] ?? {};
    out[key][row.metric] = row.value === null ? null : Number(row.value);
  }
  return out;
}
