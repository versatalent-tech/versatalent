import { sql } from '../client';
import { startMembership } from './membership';
import {
  RENEWAL_WINDOW_DAYS,
  benefitsOnOffer,
  type BenefitStatus,
  type FoundingBadge,
  type FoundingPaymentStatus,
  type FoundingSettings,
  type InPersonMethod,
  type MemberFoundingStatus,
  type MembershipBenefit,
  type PaidMembership,
  type SoldBenefit,
} from '@/lib/membership/founding';

/**
 * V•PRIVILEGE Founding Membership: benefits, purchases and founding numbers.
 *
 * A purchase is "pending" until SumUp confirms payment (or staff record an
 * in-person payment). Activation is a single guarded update, so webhook
 * retries and page refreshes can't create a second year. Payment that
 * arrives when it isn't needed is flagged for refund, never ignored.
 */

function iso(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  return value instanceof Date ? value.toISOString() : String(value);
}

// ---------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------

const DEFAULTS: FoundingSettings = { founding_on_sale: false, founding_price_cents: 2999, founding_cap: 500 };

export async function getFoundingSettings(): Promise<FoundingSettings> {
  const rows = await sql`
    SELECT key, value FROM programme_settings WHERE key IN ('founding_on_sale', 'founding_price_cents', 'founding_cap')
  `;
  const values = Object.fromEntries(rows.map((r: any) => [r.key, r.value]));
  const int = (v: unknown, fallback: number) => (Number.isInteger(v) ? (v as number) : fallback);
  return {
    founding_on_sale: values.founding_on_sale === true,
    founding_price_cents: int(values.founding_price_cents, DEFAULTS.founding_price_cents),
    founding_cap: int(values.founding_cap, DEFAULTS.founding_cap),
  };
}

export async function updateFoundingSettings(changes: Partial<FoundingSettings>, userId: string | null): Promise<FoundingSettings> {
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
  return getFoundingSettings();
}

// ---------------------------------------------------------------------------
// Benefits
// ---------------------------------------------------------------------------

function mapBenefit(r: any): MembershipBenefit {
  return {
    id: r.id,
    title: r.title,
    description: r.description,
    limit_text: r.limit_text,
    eligibility_text: r.eligibility_text,
    owner: r.owner,
    unit_cost_cents: r.unit_cost_cents === null ? null : Number(r.unit_cost_cents),
    status: r.status,
    sort_order: Number(r.sort_order),
  };
}

export async function listBenefits(): Promise<MembershipBenefit[]> {
  const rows = await sql`SELECT * FROM membership_benefits ORDER BY (status = 'retired'), sort_order, created_at`;
  return rows.map(mapBenefit);
}

export async function getBenefitsOnOffer(): Promise<SoldBenefit[]> {
  const rows = await sql`SELECT * FROM membership_benefits WHERE status = 'active' ORDER BY sort_order, created_at`;
  return benefitsOnOffer(rows.map(mapBenefit));
}

export interface BenefitInput {
  title: string;
  description: string | null;
  limit_text: string | null;
  eligibility_text: string | null;
  owner: string | null;
  unit_cost_cents: number | null;
  status: BenefitStatus;
  sort_order: number;
}

export async function getBenefit(id: string): Promise<MembershipBenefit | null> {
  const rows = await sql`SELECT * FROM membership_benefits WHERE id = ${id} LIMIT 1`;
  return rows[0] ? mapBenefit(rows[0]) : null;
}

export async function createBenefit(input: BenefitInput, userId: string | null): Promise<MembershipBenefit> {
  const rows = await sql`
    INSERT INTO membership_benefits (title, description, limit_text, eligibility_text, owner, unit_cost_cents, status, sort_order, updated_by)
    VALUES (${input.title}, ${input.description}, ${input.limit_text}, ${input.eligibility_text}, ${input.owner},
            ${input.unit_cost_cents}, ${input.status}, ${input.sort_order}, ${userId})
    RETURNING *
  `;
  return mapBenefit(rows[0]);
}

export async function updateBenefit(id: string, input: BenefitInput, userId: string | null): Promise<MembershipBenefit | null> {
  const rows = await sql`
    UPDATE membership_benefits SET title = ${input.title}, description = ${input.description}, limit_text = ${input.limit_text},
      eligibility_text = ${input.eligibility_text}, owner = ${input.owner}, unit_cost_cents = ${input.unit_cost_cents},
      status = ${input.status}, sort_order = ${input.sort_order}, updated_by = ${userId}, updated_at = NOW()
    WHERE id = ${id}
    RETURNING *
  `;
  return rows[0] ? mapBenefit(rows[0]) : null;
}

// ---------------------------------------------------------------------------
// Purchases
// ---------------------------------------------------------------------------

/** Mark years that have run out as expired (cheap; called before reads) */
export async function expireMemberships(): Promise<number> {
  const rows = await sql`
    UPDATE paid_memberships SET status = 'expired', updated_at = NOW()
    WHERE status = 'active' AND ends_at <= NOW()
    RETURNING id
  `;
  return rows.length;
}

async function foundingNumbersAssigned(): Promise<number> {
  const rows = await sql`SELECT COUNT(*) AS n FROM founding_members`;
  return Number(rows[0].n);
}

/** Why this person can't buy right now, or null if they can */
async function purchaseBlocker(userId: string, settings: FoundingSettings): Promise<string | null> {
  if (!settings.founding_on_sale) return 'The Founding Membership isn’t on sale at the moment.';
  const rows = await sql`
    SELECT
      (SELECT founding_number FROM founding_members WHERE user_id = ${userId}) AS founding_number,
      (SELECT MAX(ends_at) FROM paid_memberships WHERE user_id = ${userId} AND status = 'active') AS paid_until
  `;
  const { founding_number, paid_until } = rows[0];
  if (paid_until) {
    const until = new Date(paid_until);
    const windowOpens = new Date(until.getTime() - RENEWAL_WINDOW_DAYS * 86400000);
    if (Date.now() < windowOpens.getTime()) {
      return `You’re a member until ${until.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/London' })}. You can renew from ${windowOpens.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/London' })}.`;
    }
  }
  if (!founding_number && (await foundingNumbersAssigned()) >= settings.founding_cap) {
    return 'All Founding Memberships have been taken.';
  }
  return null;
}

export interface PendingPurchase {
  id: string;
  user_id: string;
  price_cents: number;
  currency: string;
  payment_attempts: number;
}

export type PrepareResult = { ok: true; purchase: PendingPurchase } | { ok: false; error: string };

/**
 * Get this person's unpaid purchase ready for a payment attempt (reusing one
 * in progress), with today's price, benefits and terms. A purchase is only
 * prepared when they're allowed to buy.
 */
export async function preparePurchase(userId: string, settings: FoundingSettings, termsVersion: string): Promise<PrepareResult> {
  await expireMemberships();
  const blocker = await purchaseBlocker(userId, settings);
  if (blocker) return { ok: false, error: blocker };

  const benefits = JSON.stringify(await getBenefitsOnOffer());
  const price = settings.founding_price_cents;

  // Reuse the latest unpaid purchase (pending first, then a recently failed one)
  const reuse = await sql`
    UPDATE paid_memberships SET status = 'pending', price_cents = ${price}, benefits = ${benefits}::jsonb,
      terms_version = ${termsVersion}, updated_at = NOW()
    WHERE id = (
      SELECT id FROM paid_memberships
      WHERE user_id = ${userId}
        AND (status = 'pending' OR (status = 'payment_failed' AND NOT EXISTS (
          SELECT 1 FROM paid_memberships p WHERE p.user_id = ${userId} AND p.status = 'pending')))
      ORDER BY (status = 'pending') DESC, created_at DESC LIMIT 1
    )
    RETURNING *
  `;
  const row =
    reuse[0] ??
    (
      await sql`
        INSERT INTO paid_memberships (user_id, price_cents, benefits, terms_version)
        VALUES (${userId}, ${price}, ${benefits}::jsonb, ${termsVersion})
        RETURNING *
      `
    )[0];
  return {
    ok: true,
    purchase: { id: row.id, user_id: row.user_id, price_cents: Number(row.price_cents), currency: row.currency, payment_attempts: Number(row.payment_attempts) },
  };
}

export async function getPendingPurchase(membershipId: string): Promise<(PendingPurchase & { status: string }) | null> {
  const rows = await sql`SELECT * FROM paid_memberships WHERE id = ${membershipId} LIMIT 1`;
  const r = rows[0];
  return r
    ? { id: r.id, user_id: r.user_id, status: r.status, price_cents: Number(r.price_cents), currency: r.currency, payment_attempts: Number(r.payment_attempts) }
    : null;
}

/** Remember the payment page created for this attempt (only while unpaid) */
export async function recordFoundingCheckout(purchase: PendingPurchase, checkoutId: string, reference: string): Promise<boolean> {
  const [, updated] = await sql.transaction([
    sql`
      INSERT INTO paid_membership_checkouts (checkout_id, membership_id, reference, amount_cents, currency)
      VALUES (${checkoutId}, ${purchase.id}, ${reference}, ${purchase.price_cents}, ${purchase.currency})
    `,
    sql`
      UPDATE paid_memberships SET sumup_checkout_id = ${checkoutId}, payment_attempts = payment_attempts + 1,
        status = 'pending', updated_at = NOW()
      WHERE id = ${purchase.id} AND status IN ('pending', 'payment_failed')
      RETURNING id
    `,
  ]);
  return (updated as unknown[]).length > 0;
}

export interface FoundingCheckoutRecord {
  checkout_id: string;
  membership_id: string;
  reference: string;
  amount_cents: number;
  currency: string;
  outcome: string;
}

export async function getFoundingCheckout(checkoutId: string): Promise<FoundingCheckoutRecord | null> {
  const rows = await sql`SELECT * FROM paid_membership_checkouts WHERE checkout_id = ${checkoutId} LIMIT 1`;
  const r = rows[0];
  return r
    ? { checkout_id: r.checkout_id, membership_id: r.membership_id, reference: r.reference, amount_cents: Number(r.amount_cents), currency: r.currency, outcome: r.outcome }
    : null;
}

export async function getLatestFoundingCheckout(membershipId: string): Promise<FoundingCheckoutRecord | null> {
  const rows = await sql`SELECT sumup_checkout_id FROM paid_memberships WHERE id = ${membershipId} LIMIT 1`;
  return rows[0]?.sumup_checkout_id ? getFoundingCheckout(rows[0].sumup_checkout_id) : null;
}

export async function setFoundingCheckoutOutcome(
  checkoutId: string,
  outcome: 'paid' | 'failed' | 'expired',
  transactionCode: string | null = null
): Promise<void> {
  await sql`
    UPDATE paid_membership_checkouts SET outcome = ${outcome}, transaction_code = COALESCE(${transactionCode}, transaction_code), updated_at = NOW()
    WHERE checkout_id = ${checkoutId} AND outcome <> 'paid'
  `;
}

/** Give this person the next founding number, unless they already have one */
async function assignFoundingNumber(userId: string): Promise<void> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const existing = await sql`SELECT 1 FROM founding_members WHERE user_id = ${userId}`;
    if (existing.length > 0) return;
    try {
      await sql`
        INSERT INTO founding_members (user_id, founding_number)
        SELECT ${userId}, COALESCE(MAX(founding_number), 0) + 1 FROM founding_members
        ON CONFLICT (user_id) DO NOTHING
      `;
      return;
    } catch (error: any) {
      if (error?.code !== '23505') throw error; // someone else took that number at the same moment: try the next
    }
  }
  throw new Error('Could not assign a founding number');
}

export interface Activation {
  checkoutId?: string | null;
  transactionCode?: string | null;
  source?: 'online' | 'in_person';
  method?: InPersonMethod | null;
  reference?: string | null;
  priceCents?: number;
  actorId?: string | null;
}

/**
 * Start the paid year. Only the first confirmation changes anything. The
 * year starts now, or when the member's current year ends (early renewal).
 * Returns true when this call activated it.
 */
export async function activateMembership(membershipId: string, how: Activation = {}): Promise<boolean> {
  const rows = await sql`
    WITH target AS (
      SELECT id, user_id FROM paid_memberships WHERE id = ${membershipId} AND status IN ('pending', 'payment_failed')
    ), start AS (
      SELECT GREATEST(NOW(), COALESCE((
        SELECT MAX(p.ends_at) FROM paid_memberships p, target
        WHERE p.user_id = target.user_id AND p.status = 'active' AND p.id <> target.id
      ), NOW())) AS at
    )
    UPDATE paid_memberships m SET
      status = 'active', paid_at = NOW(),
      starts_at = (SELECT at FROM start),
      ends_at = (SELECT at FROM start) + INTERVAL '12 months',
      sumup_checkout_id = COALESCE(${how.checkoutId ?? null}::text, m.sumup_checkout_id),
      sumup_transaction_code = ${how.transactionCode ?? null},
      source = ${how.source ?? 'online'},
      payment_method = ${how.method ?? null},
      payment_reference = ${how.reference ?? null},
      price_cents = COALESCE(${how.priceCents ?? null}::integer, m.price_cents),
      handled_by = ${how.actorId ?? null},
      updated_at = NOW()
    FROM target
    -- Repeated here so a second confirmation running at the same moment re-checks it after the first commits
    WHERE m.id = target.id AND m.status IN ('pending', 'payment_failed')
    RETURNING m.user_id
  `;

  if (rows.length === 0) {
    // Already active through this same payment page: a repeat confirmation, nothing to do.
    // Otherwise (paid twice, or paid after cancelling) flag the money for refund.
    if (how.checkoutId) {
      await sql`
        UPDATE paid_memberships SET needs_refund = true,
          notes = concat_ws(E'\n', notes, ${`Extra payment on SumUp checkout ${how.checkoutId}${how.transactionCode ? ` (${how.transactionCode})` : ''}: refund it in SumUp.`}::text),
          updated_at = NOW()
        WHERE id = ${membershipId} AND NOT (status IN ('active', 'expired') AND sumup_checkout_id = ${how.checkoutId}::text)
          AND needs_refund = false
      `;
    }
    return false;
  }

  const userId = rows[0].user_id;
  await assignFoundingNumber(userId);
  // Joined as a Founding Member: their card request was waiting on this payment
  const cards = await sql`
    UPDATE card_requests SET payment_status = 'included', status = 'to_post', paid_at = NOW(), updated_at = NOW()
    WHERE paid_membership_id = ${membershipId} AND status = 'awaiting_payment'
    RETURNING id
  `;
  if (cards.length > 0) await startMembership(userId);
  return true;
}

/** Failed or expired payment page: only the latest one decides */
export async function markFoundingUnpaid(membershipId: string, checkoutId: string): Promise<void> {
  await sql`
    UPDATE paid_memberships SET status = 'payment_failed', updated_at = NOW()
    WHERE id = ${membershipId} AND sumup_checkout_id = ${checkoutId} AND status = 'pending'
  `;
}

/** Staff took payment in person (card reader, SumUp app or cash) */
export async function recordInPersonPurchase(
  userId: string,
  payment: { method: InPersonMethod; reference: string | null; priceCents: number },
  settings: FoundingSettings,
  termsVersion: string,
  actorId: string | null
): Promise<{ ok: true; membershipId: string } | { ok: false; error: string }> {
  // Staff can sell even while online sales are paused
  const prepared = await preparePurchase(userId, { ...settings, founding_on_sale: true }, termsVersion);
  if ('error' in prepared) return { ok: false, error: prepared.error };
  const activated = await activateMembership(prepared.purchase.id, {
    source: 'in_person',
    method: payment.method,
    reference: payment.reference,
    priceCents: payment.priceCents,
    actorId,
  });
  return activated ? { ok: true, membershipId: prepared.purchase.id } : { ok: false, error: 'This purchase changed at the same moment; refresh and check' };
}

/** Cancel (e.g. within 14 days) or record a refund. Benefits stop straight away. */
export async function endMembership(
  membershipId: string,
  outcome: 'cancelled' | 'refunded',
  note: string | null,
  actorId: string | null
): Promise<boolean> {
  const rows = await sql`
    UPDATE paid_memberships SET status = ${outcome},
      ends_at = CASE WHEN ends_at IS NOT NULL AND ends_at > NOW() THEN GREATEST(NOW(), starts_at) ELSE ends_at END,
      needs_refund = CASE WHEN ${outcome} = 'refunded' THEN false ELSE needs_refund END,
      notes = CASE WHEN ${note}::text IS NULL THEN notes ELSE concat_ws(E'\n', notes, ${note}::text) END,
      handled_by = ${actorId}, updated_at = NOW()
    WHERE id = ${membershipId}
      AND (status IN ('pending', 'payment_failed', 'active', 'expired') OR (${outcome} = 'refunded' AND status = 'cancelled'))
    RETURNING id
  `;
  if (rows.length > 0 && outcome === 'refunded') {
    await sql`
      UPDATE paid_membership_checkouts SET refunded_at = NOW(), updated_at = NOW()
      WHERE membership_id = ${membershipId} AND outcome = 'paid' AND refunded_at IS NULL
    `;
  }
  return rows.length > 0;
}

export async function clearFoundingRefundFlag(membershipId: string, actorId: string | null): Promise<boolean> {
  const [, rows] = await sql.transaction([
    // The extra payments (paid, but not the one that started the year) are the ones refunded
    sql`
      UPDATE paid_membership_checkouts c SET refunded_at = NOW(), updated_at = NOW()
      FROM paid_memberships m
      WHERE m.id = c.membership_id AND c.membership_id = ${membershipId} AND c.outcome = 'paid' AND c.refunded_at IS NULL
        AND m.needs_refund AND (m.sumup_checkout_id IS DISTINCT FROM c.checkout_id OR m.status NOT IN ('active', 'expired'))
    `,
    sql`
      UPDATE paid_memberships SET needs_refund = false, handled_by = ${actorId}, updated_at = NOW()
      WHERE id = ${membershipId} AND needs_refund RETURNING id
    `,
  ]);
  return (rows as unknown[]).length > 0;
}

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

function mapMembership(r: any): PaidMembership {
  const now = Date.now();
  const starts = r.starts_at ? new Date(r.starts_at).getTime() : null;
  const ends = r.ends_at ? new Date(r.ends_at).getTime() : null;
  const active = r.status === 'active' && starts !== null && ends !== null;
  return {
    id: r.id,
    member: { id: r.user_id, name: r.member_name, email: r.member_email },
    founding_number: r.founding_number === null ? null : Number(r.founding_number),
    status: r.status,
    is_current: active && starts! <= now && now < ends!,
    is_upcoming: active && starts! > now,
    price_cents: Number(r.price_cents),
    currency: r.currency,
    source: r.source,
    payment_method: r.payment_method,
    benefits: Array.isArray(r.benefits) ? r.benefits : [],
    terms_version: r.terms_version,
    starts_at: iso(r.starts_at),
    ends_at: iso(r.ends_at),
    sumup_transaction_code: r.sumup_transaction_code,
    payment_reference: r.payment_reference,
    paid_at: iso(r.paid_at),
    needs_refund: Boolean(r.needs_refund),
    notes: r.notes,
    created_at: iso(r.created_at)!,
  };
}

const membershipSelect = () => sql`
  SELECT m.*, u.name AS member_name, u.email AS member_email, f.founding_number
  FROM paid_memberships m
  JOIN users u ON u.id = m.user_id
  LEFT JOIN founding_members f ON f.user_id = m.user_id
`;

export type MembershipFilter = 'current' | 'expiring' | 'pending' | 'ended' | 'refund' | 'all';

export async function listPaidMemberships(filter: MembershipFilter): Promise<PaidMembership[]> {
  await expireMemberships();
  const rows =
    filter === 'current'
      ? await sql`${membershipSelect()} WHERE m.status = 'active' ORDER BY f.founding_number NULLS LAST, m.starts_at LIMIT 1000`
      : filter === 'expiring'
        ? await sql`${membershipSelect()} WHERE m.status = 'active' AND m.ends_at <= NOW() + INTERVAL '30 days'
            AND NOT EXISTS (SELECT 1 FROM paid_memberships n WHERE n.user_id = m.user_id AND n.status = 'active' AND n.starts_at >= m.ends_at)
            ORDER BY m.ends_at LIMIT 1000`
        : filter === 'pending'
          ? await sql`${membershipSelect()} WHERE m.status IN ('pending', 'payment_failed') ORDER BY m.updated_at DESC LIMIT 1000`
          : filter === 'ended'
            ? await sql`${membershipSelect()} WHERE m.status IN ('expired', 'cancelled', 'refunded') ORDER BY m.updated_at DESC LIMIT 1000`
            : filter === 'refund'
              ? await sql`${membershipSelect()} WHERE m.needs_refund ORDER BY m.updated_at DESC LIMIT 1000`
              : await sql`${membershipSelect()} ORDER BY m.created_at DESC LIMIT 1000`;
  return rows.map(mapMembership);
}

export async function getPaidMembership(id: string): Promise<PaidMembership | null> {
  const rows = await sql`${membershipSelect()} WHERE m.id = ${id} LIMIT 1`;
  return rows[0] ? mapMembership(rows[0]) : null;
}

export interface FoundingStats {
  current: number;
  numbers_assigned: number;
  cap: number;
  expiring_30_days: number;
  awaiting_payment: number;
  needs_refund: number;
  /** Paid in the last 12 months, refunds excluded, per currency */
  revenue: { currency: string; cents: number }[];
}

export async function getFoundingStats(settings: FoundingSettings): Promise<FoundingStats> {
  await expireMemberships();
  const [counts, revenue] = await Promise.all([
    sql`
      SELECT
        COUNT(DISTINCT user_id) FILTER (WHERE status = 'active' AND starts_at <= NOW()) AS current,
        COUNT(*) FILTER (WHERE status = 'active' AND ends_at <= NOW() + INTERVAL '30 days'
          AND NOT EXISTS (SELECT 1 FROM paid_memberships n WHERE n.user_id = paid_memberships.user_id AND n.status = 'active' AND n.starts_at >= paid_memberships.ends_at)) AS expiring,
        COUNT(*) FILTER (WHERE status = 'pending') AS awaiting_payment,
        COUNT(*) FILTER (WHERE needs_refund) AS needs_refund,
        (SELECT COUNT(*) FROM founding_members) AS numbers_assigned
      FROM paid_memberships
    `,
    sql`
      SELECT currency, SUM(price_cents) AS cents FROM paid_memberships
      WHERE paid_at > NOW() - INTERVAL '12 months' AND status IN ('active', 'expired', 'cancelled')
      GROUP BY currency ORDER BY currency
    `,
  ]);
  const c = counts[0];
  return {
    current: Number(c.current),
    numbers_assigned: Number(c.numbers_assigned),
    cap: settings.founding_cap,
    expiring_30_days: Number(c.expiring),
    awaiting_payment: Number(c.awaiting_payment),
    needs_refund: Number(c.needs_refund),
    revenue: revenue.map((r: any) => ({ currency: r.currency, cents: Number(r.cents) })),
  };
}

export interface FoundingPayment {
  kind: 'online' | 'in_person';
  /** SumUp checkout id (online) or the purchase id (in person) */
  key: string;
  membership_id: string;
  member_name: string;
  amount_cents: number;
  currency: string;
  transaction_code: string | null;
  method: string | null;
  paid_at: string;
  membership_status: string;
  /** Recorded as refunded in SumUp */
  refunded: boolean;
  /** Online payment that didn't start a year and hasn't been refunded */
  problem: string | null;
}

/** Every payment taken, matched to what it paid for (for checking against SumUp) */
export async function listFoundingPayments(): Promise<FoundingPayment[]> {
  const rows = await sql`
    SELECT 'online' AS kind, c.checkout_id AS key, m.id AS membership_id, u.name AS member_name, c.amount_cents, c.currency,
      c.transaction_code, NULL AS method, c.created_at AS paid_at, m.status AS membership_status,
      c.refunded_at IS NOT NULL AS refunded,
      CASE
        WHEN c.refunded_at IS NOT NULL OR m.status = 'refunded' THEN NULL
        WHEN m.sumup_checkout_id IS DISTINCT FROM c.checkout_id OR m.status NOT IN ('active', 'expired') THEN 'Didn’t start a membership year: refund it in SumUp'
        ELSE NULL
      END AS problem
    FROM paid_membership_checkouts c
    JOIN paid_memberships m ON m.id = c.membership_id
    JOIN users u ON u.id = m.user_id
    WHERE c.outcome = 'paid'
    UNION ALL
    SELECT 'in_person', m.id::text, m.id, u.name, m.price_cents, m.currency, m.payment_reference, m.payment_method, m.paid_at,
      m.status, m.status = 'refunded', NULL
    FROM paid_memberships m JOIN users u ON u.id = m.user_id
    WHERE m.source = 'in_person' AND m.paid_at IS NOT NULL
    ORDER BY paid_at DESC
    LIMIT 1000
  `;
  return rows.map((r: any) => ({
    kind: r.kind,
    key: r.key,
    membership_id: r.membership_id,
    member_name: r.member_name,
    amount_cents: Number(r.amount_cents),
    currency: r.currency,
    transaction_code: r.transaction_code,
    method: r.method,
    paid_at: iso(r.paid_at)!,
    membership_status: r.membership_status,
    refunded: Boolean(r.refunded),
    problem: r.problem,
  }));
}

/** Member pass page: their membership, or the offer */
export async function getMemberFoundingStatus(userId: string, settings: FoundingSettings): Promise<MemberFoundingStatus> {
  await expireMemberships();
  const [rows, offer, blocker] = await Promise.all([
    sql`
      SELECT m.status, m.starts_at, m.ends_at, m.benefits, f.founding_number
      FROM paid_memberships m LEFT JOIN founding_members f ON f.user_id = m.user_id
      WHERE m.user_id = ${userId} AND m.status IN ('active', 'expired')
      ORDER BY m.ends_at DESC
    `,
    getBenefitsOnOffer(),
    purchaseBlocker(userId, settings),
  ]);
  const number = await sql`SELECT founding_number FROM founding_members WHERE user_id = ${userId}`;
  const now = Date.now();
  const active = rows.filter((r: any) => r.status === 'active');
  const current = active.find((r: any) => new Date(r.starts_at).getTime() <= now && now < new Date(r.ends_at).getTime());
  const upcoming = active.find((r: any) => new Date(r.starts_at).getTime() > now);
  const lastEnded = rows.find((r: any) => r.status === 'expired');
  const lapsed =
    !current && lastEnded && now - new Date(lastEnded.ends_at).getTime() < 365 * 86400000 ? iso(lastEnded.ends_at) : null;

  return {
    founding_number: number[0] ? Number(number[0].founding_number) : null,
    current: current ? { starts_at: iso(current.starts_at)!, ends_at: iso(current.ends_at)!, benefits: current.benefits ?? [] } : null,
    upcoming: upcoming ? { starts_at: iso(upcoming.starts_at)!, ends_at: iso(upcoming.ends_at)! } : null,
    lapsed_on: lapsed,
    can_buy: blocker === null,
    cannot_buy_reason: blocker,
    price_cents: settings.founding_price_cents,
    benefits_on_offer: offer,
  };
}

/** Door check-in: Founding badge, or "expired" for a year that has ended */
export async function getFoundingBadge(userId: string): Promise<FoundingBadge | null> {
  const rows = await sql`
    SELECT m.ends_at, f.founding_number,
      (m.status = 'active' AND m.starts_at <= NOW() AND m.ends_at > NOW()) AS is_current
    FROM paid_memberships m LEFT JOIN founding_members f ON f.user_id = m.user_id
    WHERE m.user_id = ${userId} AND m.status IN ('active', 'expired') AND m.starts_at <= NOW()
    ORDER BY m.ends_at DESC LIMIT 1
  `;
  const r = rows[0];
  if (!r) return null;
  return {
    founding_number: r.founding_number === null ? null : Number(r.founding_number),
    state: r.is_current ? 'active' : 'expired',
    ends_at: iso(r.ends_at)!,
  };
}

/** Thank-you page after paying: first name and dates only */
export async function getFoundingPaymentStatus(membershipId: string): Promise<FoundingPaymentStatus | null> {
  const rows = await sql`
    SELECT m.status, m.starts_at, m.ends_at, m.price_cents, u.name, f.founding_number,
      r.status AS card_status, r.postcode AS card_postcode
    FROM paid_memberships m
    JOIN users u ON u.id = m.user_id
    LEFT JOIN founding_members f ON f.user_id = m.user_id
    LEFT JOIN card_requests r ON r.paid_membership_id = m.id
    WHERE m.id = ${membershipId} LIMIT 1
  `;
  const r = rows[0];
  if (!r) return null;
  return {
    first_name: String(r.name).split(' ')[0],
    status: r.status,
    founding_number: r.status === 'active' && r.founding_number !== null ? Number(r.founding_number) : null,
    starts_at: iso(r.starts_at),
    ends_at: iso(r.ends_at),
    price_cents: Number(r.price_cents),
    card: r.card_status ? { status: r.card_status, postcode_hint: `${String(r.card_postcode).split(' ')[0]} ••` } : null,
    can_retry_payment: r.status === 'pending' || r.status === 'payment_failed',
  };
}

/** Find a member for an in-person sale: by email or by card UID */
export async function findMemberForSale(query: { email?: string; card_uid?: string }): Promise<{ id: string; name: string; email: string } | null> {
  const rows = query.email
    ? await sql`SELECT id, name, email FROM users WHERE lower(email) = lower(${query.email}) AND role IN ('vip', 'artist') LIMIT 1`
    : await sql`
        SELECT u.id, u.name, u.email FROM nfc_cards c JOIN users u ON u.id = c.user_id
        WHERE upper(c.card_uid) = upper(${query.card_uid ?? ''}) AND u.role IN ('vip', 'artist') LIMIT 1
      `;
  return rows[0] ? { id: rows[0].id, name: rows[0].name, email: rows[0].email } : null;
}

/** Public membership page: the offer, if on sale */
export async function getFoundingOffer(): Promise<{
  settings: FoundingSettings;
  benefits: SoldBenefit[];
  places_left: number;
}> {
  const [settings, benefits, assigned] = await Promise.all([getFoundingSettings(), getBenefitsOnOffer(), foundingNumbersAssigned()]);
  return { settings, benefits, places_left: Math.max(0, settings.founding_cap - assigned) };
}
