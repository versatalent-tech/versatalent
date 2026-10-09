import { randomInt } from 'crypto';
import { sql } from '../client';
import {
  CLAIM_CODE_ALPHABET,
  CLAIM_CODE_LENGTH,
  POINT_SOURCE_LABELS,
  type BalanceCheck,
  type ClaimStatus,
  type Ledger,
  type LedgerEntry,
  type LoyaltySettings,
  type MemberReward,
  type MemberRewards,
  type Reward,
  type RewardClaim,
  type RewardsReport,
  type RewardWithUsage,
  type UpcomingEvent,
} from '@/lib/loyalty/types';

/**
 * Points ledgers, rewards and claims.
 *
 * Balances only change through the database function loyalty_post(), which
 * locks the member, refuses a source key it has seen before, updates the
 * balance and writes the ledger entry in one step. Claims go through
 * reward_claim() / reward_claim_close(), which check every rule and move the
 * points in the same step. Their errors (code P0001) are written for members
 * and staff to read.
 */

function iso(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  return value instanceof Date ? value.toISOString() : String(value);
}

/** A rule the database refused, in words for the member or staff; otherwise null */
export function loyaltyErrorMessage(error: unknown): string | null {
  const e = error as { code?: string; message?: string } | null;
  return e?.code === 'P0001' && e.message ? e.message : null;
}

// ---------------------------------------------------------------------------
// Posting points
// ---------------------------------------------------------------------------

export type PostMode = 'strict' | 'clamp';

export interface PostInput {
  userId: string;
  ledger: Ledger;
  delta: number;
  source: string;
  /** Unique per ledger: the same key is never posted twice */
  sourceKey: string;
  refId?: string | null;
  metadata?: Record<string, unknown>;
  actorId?: string | null;
  mode?: PostMode;
}

export interface PostResult {
  id: string;
  applied: number;
  balance: number;
  duplicate: boolean;
}

export async function postPoints(input: PostInput): Promise<PostResult> {
  const rows = await sql`
    SELECT * FROM loyalty_post(
      ${input.userId}::uuid, ${input.ledger}, ${Math.trunc(input.delta)}::integer, ${input.source}, ${input.sourceKey},
      ${input.refId ?? null}::uuid, ${JSON.stringify(input.metadata ?? {})}::jsonb, ${input.actorId ?? null}::uuid,
      ${input.mode ?? 'clamp'}
    )
  `;
  const r = rows[0];
  return { id: r.out_id, applied: Number(r.out_applied), balance: Number(r.out_balance), duplicate: Boolean(r.out_duplicate) };
}

/** Next membership year: secured tier, status points back to zero (logged) */
export async function startMembershipYear(userId: string, previousYearStart: string, yearsEnded: number, tier: string): Promise<boolean> {
  const rows = await sql`SELECT loyalty_start_year(${userId}::uuid, ${previousYearStart}::date, ${yearsEnded}::integer, ${tier}) AS moved`;
  return Boolean(rows[0]?.moved);
}

// ---------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------

export async function getLoyaltySettings(): Promise<LoyaltySettings> {
  const rows = await sql`SELECT key, value FROM programme_settings WHERE key IN ('rewards_open', 'reward_earn_percent')`;
  const values = Object.fromEntries(rows.map((r: any) => [r.key, r.value]));
  const percent = Number(values.reward_earn_percent);
  return {
    rewards_open: values.rewards_open === true,
    reward_earn_percent: Number.isFinite(percent) ? Math.min(1000, Math.max(0, percent)) : 100,
  };
}

export async function updateLoyaltySettings(changes: Partial<LoyaltySettings>, userId: string | null): Promise<LoyaltySettings> {
  const entries = Object.entries(changes).filter(([, v]) => v !== undefined);
  if (entries.length > 0) {
    await sql.transaction(
      entries.map(
        ([key, value]) => sql`
          INSERT INTO programme_settings (key, value, updated_by, updated_at)
          VALUES (${key}, ${JSON.stringify(value)}, ${userId}, NOW())
          ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_by = EXCLUDED.updated_by, updated_at = NOW()
        `
      )
    );
  }
  return getLoyaltySettings();
}

// ---------------------------------------------------------------------------
// Ledger reads
// ---------------------------------------------------------------------------

export async function listLedger(userId: string, ledger: Ledger | null, limit = 50): Promise<LedgerEntry[]> {
  const rows = ledger
    ? await sql`
        SELECT * FROM vip_points_log WHERE user_id = ${userId} AND ledger = ${ledger}
        ORDER BY created_at DESC LIMIT ${limit}
      `
    : await sql`
        SELECT * FROM vip_points_log WHERE user_id = ${userId} AND ledger IN ('status', 'reward')
        ORDER BY created_at DESC LIMIT ${limit}
      `;
  return rows.map((r: any) => ({
    id: r.id,
    ledger: r.ledger,
    source: r.source,
    label: (r.metadata?.reward as string) ? `${POINT_SOURCE_LABELS[r.source] ?? r.source}: ${r.metadata.reward}` : POINT_SOURCE_LABELS[r.source] ?? r.source,
    delta_points: Number(r.delta_points),
    balance_after: Number(r.balance_after),
    created_at: iso(r.created_at)!,
    reason: r.metadata?.reason ?? null,
  }));
}

/** Members whose balance doesn't equal the sum of its ledger (should be none) */
export async function balanceChecks(): Promise<{ checked: number; mismatches: BalanceCheck[] }> {
  const rows = await sql`
    SELECT m.user_id, u.name, l.ledger, l.balance, COALESCE(s.total, 0) AS ledger_sum
    FROM vip_memberships m
    JOIN users u ON u.id = m.user_id
    CROSS JOIN LATERAL (VALUES ('reward', m.points_balance), ('status', m.status_points)) AS l(ledger, balance)
    LEFT JOIN LATERAL (
      SELECT SUM(delta_points) AS total FROM vip_points_log p WHERE p.user_id = m.user_id AND p.ledger = l.ledger
    ) s ON true
  `;
  const mismatches = rows
    .filter((r: any) => Number(r.balance) !== Number(r.ledger_sum))
    .map((r: any) => ({ user_id: r.user_id, name: r.name, ledger: r.ledger, balance: Number(r.balance), ledger_sum: Number(r.ledger_sum) }));
  return { checked: rows.length / 2, mismatches };
}

// ---------------------------------------------------------------------------
// Rewards
// ---------------------------------------------------------------------------

function mapReward(r: any): Reward {
  const num = (v: unknown) => (v === null || v === undefined ? null : Number(v));
  return {
    id: r.id,
    title: r.title,
    description: r.description,
    kind: r.kind,
    point_cost: Number(r.point_cost),
    unit_cost_cents: num(r.unit_cost_cents),
    stock: num(r.stock),
    per_member_limit: num(r.per_member_limit),
    limit_period: r.limit_period,
    requires_event: Boolean(r.requires_event),
    event_ids: r.event_ids ?? null,
    per_event_cap: num(r.per_event_cap),
    book_hours_before: Number(r.book_hours_before),
    needs_guest_name: Boolean(r.needs_guest_name),
    min_tier: r.min_tier,
    founding_only: Boolean(r.founding_only),
    birthday_month_only: Boolean(r.birthday_month_only),
    claim_valid_days: Number(r.claim_valid_days),
    valid_from: r.valid_from ? iso(r.valid_from)!.slice(0, 10) : null,
    valid_until: r.valid_until ? iso(r.valid_until)!.slice(0, 10) : null,
    is_active: Boolean(r.is_active),
    sort_order: Number(r.sort_order),
  };
}

export async function listRewards(): Promise<RewardWithUsage[]> {
  const rows = await sql`
    SELECT r.*,
      COUNT(c.id) FILTER (WHERE c.status = 'reserved') AS reserved,
      COUNT(c.id) FILTER (WHERE c.status = 'redeemed') AS redeemed,
      COUNT(c.id) FILTER (WHERE c.status = 'cancelled') AS cancelled,
      COUNT(c.id) FILTER (WHERE c.status = 'expired') AS expired
    FROM rewards r LEFT JOIN reward_claims c ON c.reward_id = r.id
    GROUP BY r.id
    ORDER BY r.is_active DESC, r.sort_order, r.created_at
  `;
  return rows.map((r: any) => ({
    ...mapReward(r),
    reserved: Number(r.reserved),
    redeemed: Number(r.redeemed),
    cancelled: Number(r.cancelled),
    expired: Number(r.expired),
  }));
}

export async function getReward(id: string): Promise<Reward | null> {
  const rows = await sql`SELECT * FROM rewards WHERE id = ${id} LIMIT 1`;
  return rows[0] ? mapReward(rows[0]) : null;
}

export type RewardInput = Omit<Reward, 'id'>;

export async function createReward(input: RewardInput, userId: string | null): Promise<Reward> {
  const rows = await sql`
    INSERT INTO rewards (title, description, kind, point_cost, unit_cost_cents, stock, per_member_limit, limit_period,
      requires_event, event_ids, per_event_cap, book_hours_before, needs_guest_name, min_tier, founding_only,
      birthday_month_only, claim_valid_days, valid_from, valid_until, is_active, sort_order, updated_by)
    VALUES (${input.title}, ${input.description}, ${input.kind}, ${input.point_cost}, ${input.unit_cost_cents}, ${input.stock},
      ${input.per_member_limit}, ${input.limit_period}, ${input.requires_event}, ${input.event_ids}::uuid[], ${input.per_event_cap},
      ${input.book_hours_before}, ${input.needs_guest_name}, ${input.min_tier}, ${input.founding_only}, ${input.birthday_month_only},
      ${input.claim_valid_days}, ${input.valid_from}::date, ${input.valid_until}::date, ${input.is_active}, ${input.sort_order}, ${userId})
    RETURNING *
  `;
  return mapReward(rows[0]);
}

export async function updateReward(id: string, input: RewardInput, userId: string | null): Promise<Reward | null> {
  const rows = await sql`
    UPDATE rewards SET title = ${input.title}, description = ${input.description}, kind = ${input.kind},
      point_cost = ${input.point_cost}, unit_cost_cents = ${input.unit_cost_cents}, stock = ${input.stock},
      per_member_limit = ${input.per_member_limit}, limit_period = ${input.limit_period}, requires_event = ${input.requires_event},
      event_ids = ${input.event_ids}::uuid[], per_event_cap = ${input.per_event_cap}, book_hours_before = ${input.book_hours_before},
      needs_guest_name = ${input.needs_guest_name}, min_tier = ${input.min_tier}, founding_only = ${input.founding_only},
      birthday_month_only = ${input.birthday_month_only}, claim_valid_days = ${input.claim_valid_days},
      valid_from = ${input.valid_from}::date, valid_until = ${input.valid_until}::date, is_active = ${input.is_active},
      sort_order = ${input.sort_order}, updated_by = ${userId}, updated_at = NOW()
    WHERE id = ${id}
    RETURNING *
  `;
  return rows[0] ? mapReward(rows[0]) : null;
}

// ---------------------------------------------------------------------------
// Claims
// ---------------------------------------------------------------------------

/** Close claims nobody used in time and give their points back */
export async function expireClaims(): Promise<number> {
  const rows = await sql`SELECT reward_expire_claims() AS n`;
  return Number(rows[0]?.n ?? 0);
}

function newClaimCode(): string {
  let code = '';
  for (let i = 0; i < CLAIM_CODE_LENGTH; i++) code += CLAIM_CODE_ALPHABET[randomInt(CLAIM_CODE_ALPHABET.length)];
  return code;
}

export type ClaimResult = { ok: true; claimId: string } | { ok: false; error: string };

export async function claimReward(input: {
  userId: string;
  rewardId: string;
  eventId?: string | null;
  guestName?: string | null;
  actorId?: string | null;
  redeemNow?: boolean;
}): Promise<ClaimResult> {
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const rows = await sql`
        SELECT reward_claim(${input.rewardId}::uuid, ${input.userId}::uuid, ${input.eventId ?? null}::uuid,
          ${input.guestName ?? null}, ${newClaimCode()}, ${input.actorId ?? null}::uuid, ${Boolean(input.redeemNow)}) AS id
      `;
      return { ok: true, claimId: rows[0].id };
    } catch (error: any) {
      const message = loyaltyErrorMessage(error);
      if (message) return { ok: false, error: message };
      if (error?.code === '23505' && String(error?.constraint ?? error?.message).includes('code')) continue; // code taken: new code
      throw error;
    }
  }
  throw new Error('Could not create a claim code');
}

export type CloseResult = { ok: true; status: ClaimStatus } | { ok: false; error: string };

export async function closeClaim(claimId: string, status: 'redeemed' | 'cancelled', actorId: string | null, reason: string | null = null): Promise<CloseResult> {
  try {
    const rows = await sql`SELECT reward_claim_close(${claimId}::uuid, ${status}, ${actorId}::uuid, ${reason}) AS status`;
    const final = rows[0].status as ClaimStatus;
    if (status === 'redeemed' && final === 'expired') return { ok: false, error: 'This claim has expired. Its points have been returned.' };
    return { ok: true, status: final };
  } catch (error) {
    const message = loyaltyErrorMessage(error);
    if (message) return { ok: false, error: message };
    throw error;
  }
}

function mapClaim(r: any): RewardClaim {
  return {
    id: r.id,
    reward_id: r.reward_id,
    reward_title: r.reward_title,
    kind: r.kind,
    member: { id: r.user_id, name: r.member_name },
    status: r.status,
    code: r.code,
    points_held: Number(r.points_held),
    unit_cost_cents: r.unit_cost_cents === null ? null : Number(r.unit_cost_cents),
    event: r.event_id ? { id: r.event_id, title: r.event_title, start_time: iso(r.event_start)! } : null,
    guest_name: r.guest_name,
    expires_at: iso(r.expires_at)!,
    redeemed_at: iso(r.redeemed_at),
    closed_at: iso(r.closed_at),
    close_reason: r.close_reason,
    claimed_by_staff: Boolean(r.created_by),
    created_at: iso(r.created_at)!,
  };
}

const claimSelect = () => sql`
  SELECT c.*, r.kind, u.name AS member_name, e.title AS event_title, e.start_time AS event_start
  FROM reward_claims c
  JOIN rewards r ON r.id = c.reward_id
  JOIN users u ON u.id = c.user_id
  LEFT JOIN events e ON e.id = c.event_id
`;

export type ClaimFilter = 'open' | 'redeemed' | 'closed' | 'all';

export async function listClaims(filter: ClaimFilter, rewardId: string | null = null): Promise<RewardClaim[]> {
  await expireClaims();
  const reward = rewardId ? sql`AND c.reward_id = ${rewardId}` : sql``;
  const rows =
    filter === 'open'
      ? await sql`${claimSelect()} WHERE c.status = 'reserved' ${reward} ORDER BY c.expires_at LIMIT 500`
      : filter === 'redeemed'
        ? await sql`${claimSelect()} WHERE c.status = 'redeemed' ${reward} ORDER BY c.redeemed_at DESC LIMIT 500`
        : filter === 'closed'
          ? await sql`${claimSelect()} WHERE c.status IN ('cancelled', 'expired') ${reward} ORDER BY c.closed_at DESC LIMIT 500`
          : await sql`${claimSelect()} WHERE true ${reward} ORDER BY c.created_at DESC LIMIT 500`;
  return rows.map(mapClaim);
}

export async function getClaim(id: string): Promise<RewardClaim | null> {
  const rows = await sql`${claimSelect()} WHERE c.id = ${id} LIMIT 1`;
  return rows[0] ? mapClaim(rows[0]) : null;
}

export async function getClaimByCode(code: string): Promise<RewardClaim | null> {
  await expireClaims();
  const rows = await sql`${claimSelect()} WHERE c.code = ${code} LIMIT 1`;
  return rows[0] ? mapClaim(rows[0]) : null;
}

/** A member's claims: open ones first, then the last few used or closed */
export async function listMemberClaims(userId: string): Promise<RewardClaim[]> {
  const rows = await sql`
    ${claimSelect()} WHERE c.user_id = ${userId}
    ORDER BY (c.status = 'reserved') DESC, c.created_at DESC LIMIT 30
  `;
  return rows.map(mapClaim);
}

export async function upcomingEvents(): Promise<UpcomingEvent[]> {
  const rows = await sql`
    SELECT id, title, start_time FROM events
    WHERE COALESCE(is_published, true) AND start_time >= NOW() - INTERVAL '12 hours'
    ORDER BY start_time LIMIT 50
  `;
  return rows.map((r: any) => ({ id: r.id, title: r.title, start_time: iso(r.start_time)! }));
}

/**
 * Rewards as one member sees them, with the reason they can't claim each
 * one yet. A preview only: the database checks again when they claim.
 */
export async function getRewardsForMember(userId: string): Promise<{ rewards: MemberReward[]; balance: number; status_points: number; tier: string; founding: boolean; settings: LoyaltySettings }> {
  const [settings, memberRows, rewardRows, events] = await Promise.all([
    getLoyaltySettings(),
    sql`
      SELECT m.points_balance, m.status_points, m.tier, m.status, m.year_start,
        (SELECT date_of_birth FROM vip_profiles WHERE user_id = m.user_id) AS dob,
        (SELECT starts_at FROM paid_memberships p WHERE p.user_id = m.user_id AND p.status = 'active'
          AND p.starts_at <= NOW() AND p.ends_at > NOW() ORDER BY p.starts_at DESC LIMIT 1) AS founding_start
      FROM vip_memberships m WHERE m.user_id = ${userId}
    `,
    sql`
      SELECT r.*,
        (SELECT COUNT(*) FROM reward_claims c WHERE c.reward_id = r.id AND c.status IN ('reserved', 'redeemed')) AS used_total,
        (SELECT json_agg(json_build_object('at', c.created_at, 'event', c.event_id)) FROM reward_claims c
          WHERE c.reward_id = r.id AND c.user_id = ${userId} AND c.status IN ('reserved', 'redeemed')) AS mine
      FROM rewards r
      WHERE r.is_active
        AND (r.valid_from IS NULL OR r.valid_from <= (NOW() AT TIME ZONE 'Europe/London')::date)
        AND (r.valid_until IS NULL OR r.valid_until >= (NOW() AT TIME ZONE 'Europe/London')::date)
      ORDER BY r.sort_order, r.created_at
    `,
    upcomingEvents(),
  ]);

  const m = memberRows[0];
  const balance = m ? Number(m.points_balance) : 0;
  const foundingStart = m?.founding_start ? new Date(m.founding_start) : null;
  const tiers = ['silver', 'gold', 'black'];
  const ukMonth = Number(new Date().toLocaleString('en-GB', { timeZone: 'Europe/London', month: 'numeric' }));
  const yearStart = m ? new Date(`${String(m.year_start instanceof Date ? m.year_start.toISOString() : m.year_start).slice(0, 10)}T00:00:00`) : null;

  const rewards = rewardRows
    .filter((r: any) => !r.founding_only || foundingStart) // Founding rewards appear only to Founding Members
    .map((row: any): MemberReward => {
      const r = mapReward(row);
      const mine: { at: string; event: string | null }[] = row.mine ?? [];
      const eventsForReward = r.requires_event
        ? events.filter(
            (e) =>
              (!r.event_ids || r.event_ids.includes(e.id)) &&
              // No booking deadline: tonight's event still counts (the list already ends 12h after the start)
              (r.book_hours_before === 0 || new Date(e.start_time).getTime() - Date.now() >= r.book_hours_before * 3600000) &&
              !mine.some((c) => c.event === e.id)
          )
        : [];

      let blocked: string | null = null;
      if (!settings.rewards_open) blocked = 'Rewards open soon';
      else if (!m || m.status !== 'active') blocked = 'Needs an active membership';
      else if (r.min_tier && tiers.indexOf(m.tier) < tiers.indexOf(r.min_tier)) blocked = `For ${r.min_tier[0].toUpperCase()}${r.min_tier.slice(1)} members and above`;
      else if (r.birthday_month_only && (!m.dob || new Date(m.dob).getMonth() + 1 !== ukMonth)) blocked = 'Available in your birthday month';
      else if (r.stock !== null && Number(row.used_total) >= r.stock) blocked = 'All gone';
      else if (r.per_member_limit !== null) {
        const since = r.limit_period === 'ever' ? null : r.founding_only ? foundingStart : yearStart;
        const count = mine.filter((c) => !since || new Date(c.at) >= since).length;
        if (count >= r.per_member_limit) blocked = r.limit_period === 'year' ? 'Used up for this year' : 'Already claimed';
      }
      if (!blocked && r.requires_event && eventsForReward.length === 0) blocked = 'No upcoming events to use it at';
      if (!blocked && r.point_cost > balance) blocked = `${(r.point_cost - balance).toLocaleString('en-GB')} more points needed`;

      return {
        id: r.id,
        title: r.title,
        description: r.description,
        kind: r.kind,
        point_cost: r.point_cost,
        requires_event: r.requires_event,
        needs_guest_name: r.needs_guest_name,
        book_hours_before: r.book_hours_before,
        founding_only: r.founding_only,
        events: eventsForReward,
        blocked_reason: blocked,
      };
    });

  return {
    rewards,
    balance,
    status_points: m ? Number(m.status_points) : 0,
    tier: m?.tier ?? 'silver',
    founding: Boolean(foundingStart),
    settings,
  };
}

export async function getMemberRewards(userId: string): Promise<MemberRewards> {
  await expireClaims();
  const [view, claims] = await Promise.all([getRewardsForMember(userId), listMemberClaims(userId)]);
  return {
    rewards_open: view.settings.rewards_open,
    reward_balance: view.balance,
    status_points: view.status_points,
    rewards: view.rewards,
    claims,
  };
}

// ---------------------------------------------------------------------------
// Reports
// ---------------------------------------------------------------------------

export async function rewardsReport(): Promise<RewardsReport> {
  await expireClaims();
  const rows = await sql`
    SELECT
      (SELECT COUNT(*) FROM vip_memberships WHERE status = 'active') AS members,
      (SELECT COALESCE(SUM(points_balance), 0) FROM vip_memberships) AS points_outstanding,
      (SELECT COUNT(*) FROM reward_claims WHERE status = 'reserved') AS open_claims,
      (SELECT COALESCE(SUM(unit_cost_cents), 0) FROM reward_claims WHERE status = 'reserved') AS open_claims_cost,
      (SELECT COUNT(*) FROM reward_claims WHERE created_at > NOW() - INTERVAL '30 days') AS claimed_30d,
      (SELECT COUNT(*) FROM reward_claims WHERE status = 'redeemed' AND redeemed_at > NOW() - INTERVAL '30 days') AS redeemed_30d,
      (SELECT COALESCE(SUM(unit_cost_cents), 0) FROM reward_claims WHERE status = 'redeemed' AND redeemed_at > NOW() - INTERVAL '30 days') AS redeemed_cost_30d,
      (SELECT COUNT(*) FROM reward_claims WHERE status = 'expired' AND closed_at > NOW() - INTERVAL '30 days') AS expired_30d,
      (SELECT COUNT(*) FROM reward_claims WHERE status = 'redeemed') AS redeemed_all,
      (SELECT COUNT(*) FROM reward_claims WHERE status IN ('redeemed', 'expired', 'cancelled')) AS closed_all,
      (SELECT COALESCE(SUM(delta_points), 0) FROM vip_points_log WHERE ledger = 'reward' AND delta_points > 0
         AND source IN ('event_checkin', 'consumption', 'consumption_pos', 'manual_adjust') AND created_at > NOW() - INTERVAL '30 days') AS earned_30d,
      (SELECT COALESCE(-SUM(delta_points), 0) FROM vip_points_log WHERE ledger = 'reward' AND source IN ('reward_claim', 'reward_release')
         AND created_at > NOW() - INTERVAL '30 days') AS spent_30d
  `;
  const r = rows[0];
  const closed = Number(r.closed_all);
  return {
    members: Number(r.members),
    points_outstanding: Number(r.points_outstanding),
    open_claims: Number(r.open_claims),
    open_claims_cost_cents: Number(r.open_claims_cost),
    claimed_30d: Number(r.claimed_30d),
    redeemed_30d: Number(r.redeemed_30d),
    redeemed_cost_30d_cents: Number(r.redeemed_cost_30d),
    expired_30d: Number(r.expired_30d),
    redemption_rate: closed > 0 ? Number(r.redeemed_all) / closed : null,
    points_earned_30d: Number(r.earned_30d),
    points_spent_30d: Number(r.spent_30d),
  };
}

// ---------------------------------------------------------------------------
// Till refunds
// ---------------------------------------------------------------------------

export type RefundResult =
  | { ok: true; order: { id: string; customer_user_id: string | null; staff_user_id: string | null }; pointsReversed: number }
  | { ok: false; error: string };

/**
 * Mark a paid till order refunded (the money is refunded in SumUp or as
 * cash) and take back the points it earned. Only the first call does
 * anything; the reversal keys make a retry harmless.
 */
export async function refundOrder(orderId: string, reason: string | null, actorId: string | null): Promise<RefundResult> {
  const rows = await sql`
    UPDATE pos_orders SET status = 'refunded', refunded_at = NOW(), refunded_by = ${actorId}, refund_reason = ${reason}, updated_at = NOW()
    WHERE id = ${orderId} AND status = 'paid'
    RETURNING id, customer_user_id, staff_user_id
  `;
  if (rows.length === 0) {
    const current = await sql`SELECT status FROM pos_orders WHERE id = ${orderId}`;
    if (!current[0]) return { ok: false, error: 'Order not found' };
    return { ok: false, error: current[0].status === 'refunded' ? 'This order has already been refunded' : 'Only paid orders can be refunded' };
  }
  const pointsReversed = await reverseOrderPoints(orderId, actorId);
  await sql`UPDATE vip_consumptions SET refunded_at = NOW() WHERE order_id = ${orderId} AND refunded_at IS NULL`;
  return { ok: true, order: rows[0] as any, pointsReversed };
}

/** Take back what an order earned on each ledger (never below zero; shortfall noted) */
export async function reverseOrderPoints(orderId: string, actorId: string | null): Promise<number> {
  const earned = await sql`
    SELECT user_id, ledger, delta_points FROM vip_points_log
    WHERE source_key = ${`order:${orderId}`} AND ledger IN ('status', 'reward') AND delta_points > 0
  `;
  let reversed = 0;
  for (const e of earned as any[]) {
    const result = await postPoints({
      userId: e.user_id,
      ledger: e.ledger,
      delta: -Number(e.delta_points),
      source: 'order_refund',
      sourceKey: `order_refund:${orderId}`,
      refId: orderId,
      metadata: { order_id: orderId },
      actorId,
      mode: 'clamp',
    });
    if (e.ledger === 'reward') reversed = -result.applied;
  }
  return reversed;
}

/** A member who can use the pass page (the unguessable member ID is the key) */
export async function findPassMember(memberId: string): Promise<{ id: string; name: string } | null> {
  const rows = await sql`SELECT id, name FROM users WHERE id = ${memberId} AND role IN ('vip', 'artist') AND is_active LIMIT 1`;
  return rows[0] ? { id: rows[0].id, name: rows[0].name } : null;
}
