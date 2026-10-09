import { randomInt } from 'crypto';
import { sql } from '../client';
import { postPoints } from './loyalty';
import { createVIPMembership, getVIPMembershipByUserId } from './vip-memberships';
import {
  REFERRAL_CODE_ALPHABET,
  REFERRAL_CODE_LENGTH,
  normaliseReferralCode,
  type MemberReferralSummary,
  type Referral,
  type ReferralSettings,
  type ReferralStatus,
} from '@/lib/referrals/types';

/**
 * Referrals. Points are posted with keys tied to the referral
 * ('referral:<id>', 'referral_welcome:<id>'), so approving twice, or a
 * check-in and a till order qualifying at the same moment, can't pay twice.
 */

function iso(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  return value instanceof Date ? value.toISOString() : String(value);
}

const DEFAULTS: ReferralSettings = { referrer_points: 50, referee_points: 0, min_order_cents: 1000, yearly_cap: 10 };

export async function getReferralConfig(): Promise<{ open: boolean; settings: ReferralSettings }> {
  const rows = await sql`SELECT key, value FROM programme_settings WHERE key IN ('referrals_open', 'referral_settings')`;
  const values = Object.fromEntries(rows.map((r: any) => [r.key, r.value]));
  const saved = (values.referral_settings ?? {}) as Partial<ReferralSettings>;
  const int = (v: unknown, fallback: number) => (Number.isInteger(v) && (v as number) >= 0 ? (v as number) : fallback);
  return {
    open: values.referrals_open === true,
    settings: {
      referrer_points: int(saved.referrer_points, DEFAULTS.referrer_points),
      referee_points: int(saved.referee_points, DEFAULTS.referee_points),
      min_order_cents: int(saved.min_order_cents, DEFAULTS.min_order_cents),
      yearly_cap: int(saved.yearly_cap, DEFAULTS.yearly_cap),
    },
  };
}

export async function updateReferralConfig(
  changes: { open?: boolean; settings?: Partial<ReferralSettings> },
  userId: string | null
): Promise<{ open: boolean; settings: ReferralSettings }> {
  const current = await getReferralConfig();
  const writes = [];
  if (changes.open !== undefined) writes.push(['referrals_open', changes.open] as const);
  if (changes.settings) writes.push(['referral_settings', { ...current.settings, ...changes.settings }] as const);
  if (writes.length > 0) {
    await sql.transaction(
      writes.map(
        ([key, value]) => sql`
          INSERT INTO programme_settings (key, value, updated_by, updated_at)
          VALUES (${key}, ${JSON.stringify(value)}, ${userId}, NOW())
          ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_by = EXCLUDED.updated_by, updated_at = NOW()
        `
      )
    );
  }
  return getReferralConfig();
}

// ---------------------------------------------------------------------------
// Codes
// ---------------------------------------------------------------------------

export async function getOrCreateReferralCode(userId: string): Promise<string> {
  const existing = await sql`SELECT code FROM member_referral_codes WHERE user_id = ${userId}`;
  if (existing[0]) return existing[0].code;
  for (let attempt = 0; attempt < 8; attempt++) {
    let code = '';
    for (let i = 0; i < REFERRAL_CODE_LENGTH; i++) code += REFERRAL_CODE_ALPHABET[randomInt(REFERRAL_CODE_ALPHABET.length)];
    const rows = await sql`
      INSERT INTO member_referral_codes (user_id, code) VALUES (${userId}, ${code})
      ON CONFLICT DO NOTHING
      RETURNING code
    `;
    if (rows[0]) return rows[0].code;
    const mine = await sql`SELECT code FROM member_referral_codes WHERE user_id = ${userId}`;
    if (mine[0]) return mine[0].code; // created at the same moment by another request
  }
  throw new Error('Could not create a referral code');
}

/** The member a code belongs to, if they can refer (active VIP or artist) */
export async function findReferralCodeOwner(code: string): Promise<{ id: string; name: string; email: string } | null> {
  const normalised = normaliseReferralCode(code);
  if (!normalised) return null;
  const rows = await sql`
    SELECT u.id, u.name, u.email FROM member_referral_codes c JOIN users u ON u.id = c.user_id
    WHERE c.code = ${normalised} AND u.is_active AND u.role IN ('vip', 'artist') LIMIT 1
  `;
  return rows[0] ? { id: rows[0].id, name: rows[0].name, email: rows[0].email } : null;
}

// ---------------------------------------------------------------------------
// Attribution and approval
// ---------------------------------------------------------------------------

/**
 * Attribute a new member to the code's owner (once). Checks that need a
 * human are recorded as flags; the referral then waits for review.
 */
export async function attachReferral(refereeId: string, code: string): Promise<boolean> {
  const owner = await findReferralCodeOwner(code);
  if (!owner || owner.id === refereeId) return false;

  const rows = await sql`
    WITH a AS (SELECT phone, postcode, address_line1 FROM vip_profiles WHERE user_id = ${owner.id}),
         b AS (SELECT phone, postcode, address_line1 FROM vip_profiles WHERE user_id = ${refereeId})
    SELECT
      (SELECT regexp_replace(a.phone, '\\D', '', 'g') FROM a) = (SELECT regexp_replace(b.phone, '\\D', '', 'g') FROM b) AS same_phone,
      (SELECT lower(a.postcode || a.address_line1) FROM a) = (SELECT lower(b.postcode || b.address_line1) FROM b) AS same_address,
      NOT EXISTS (SELECT 1 FROM vip_memberships m WHERE m.user_id = ${owner.id} AND m.status = 'active') AS referrer_inactive
  `;
  const checks = rows[0] ?? {};
  const flags = ['same_phone', 'same_address', 'referrer_inactive'].filter((f) => checks[f] === true);

  const inserted = await sql`
    INSERT INTO referrals (referrer_id, referee_id, code, flags)
    VALUES (${owner.id}, ${refereeId}, ${normaliseReferralCode(code)}, ${flags}::text[])
    ON CONFLICT (referee_id) DO NOTHING
    RETURNING id
  `;
  return inserted.length > 0;
}

async function award(referralId: string, referrerId: string, refereeId: string, settings: ReferralSettings, actorId: string | null) {
  for (const id of [referrerId, refereeId]) {
    if (!(await getVIPMembershipByUserId(id))) await createVIPMembership(id);
  }
  if (settings.referrer_points > 0) {
    await postPoints({
      userId: referrerId,
      ledger: 'reward',
      delta: settings.referrer_points,
      source: 'referral_bonus',
      sourceKey: `referral:${referralId}`,
      refId: referralId,
      metadata: { reason: 'Friend joined and came to an event', referee_id: refereeId },
      actorId,
    });
  }
  if (settings.referee_points > 0) {
    await postPoints({
      userId: refereeId,
      ledger: 'reward',
      delta: settings.referee_points,
      source: 'referral_bonus',
      sourceKey: `referral_welcome:${referralId}`,
      refId: referralId,
      metadata: { reason: 'Joined with a friend’s code', referrer_id: referrerId },
      actorId,
    });
  }
}

/**
 * The referred member's attendance was verified. Approve and pay out, or
 * send to review if flagged or the referrer is over the yearly limit.
 * Safe to call on every check-in and paid order.
 */
export async function qualifyReferral(refereeId: string, how: 'checkin' | 'order', orderCents = 0): Promise<ReferralStatus | null> {
  const pending = await sql`SELECT * FROM referrals WHERE referee_id = ${refereeId} AND status = 'pending' LIMIT 1`;
  const r = pending[0];
  if (!r) return null;

  const { open, settings } = await getReferralConfig();
  if (!open) return null;
  if (how === 'order' && orderCents < settings.min_order_cents) return null;

  const approvedThisYear = await sql`
    SELECT COUNT(*) AS n FROM referrals
    WHERE referrer_id = ${r.referrer_id} AND status = 'approved' AND decided_at > NOW() - INTERVAL '12 months'
  `;
  const flags: string[] = [...(r.flags ?? [])];
  if (Number(approvedThisYear[0].n) >= settings.yearly_cap && !flags.includes('cap')) flags.push('cap');

  if (flags.length > 0) {
    const moved = await sql`
      UPDATE referrals SET status = 'review', flags = ${flags}::text[], qualified_at = NOW(), qualified_by = ${how}, updated_at = NOW()
      WHERE id = ${r.id} AND status = 'pending' RETURNING id
    `;
    return moved.length ? 'review' : null;
  }

  // Claim the approval first so only one caller pays out; the point keys guard a retry
  const claimed = await sql`
    UPDATE referrals SET status = 'approved', qualified_at = NOW(), qualified_by = ${how}, decided_at = NOW(),
      referrer_points = ${settings.referrer_points}, referee_points = ${settings.referee_points}, updated_at = NOW()
    WHERE id = ${r.id} AND status = 'pending' RETURNING id
  `;
  if (claimed.length === 0) return null;
  try {
    await award(r.id, r.referrer_id, refereeId, settings, null);
  } catch (error) {
    // Put it back so the next visit (or an admin) can try again; the point keys stop a double payment
    await sql`UPDATE referrals SET status = 'pending', decided_at = NULL, updated_at = NOW() WHERE id = ${r.id}`;
    throw error;
  }
  return 'approved';
}

/** Admin decision on a referral waiting for review */
export async function decideReferral(
  id: string,
  decision: 'approved' | 'rejected',
  actorId: string | null,
  reason: string | null
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { settings } = await getReferralConfig();
  const rows = await sql`
    UPDATE referrals SET status = ${decision}, decided_at = NOW(), decided_by = ${actorId},
      reject_reason = ${decision === 'rejected' ? reason : null},
      referrer_points = CASE WHEN ${decision} = 'approved' THEN ${settings.referrer_points}::integer ELSE 0 END,
      referee_points = CASE WHEN ${decision} = 'approved' THEN ${settings.referee_points}::integer ELSE 0 END,
      updated_at = NOW()
    WHERE id = ${id} AND status IN ('review', 'pending')
    RETURNING referrer_id, referee_id
  `;
  if (rows.length === 0) return { ok: false, error: 'This referral has already been decided' };
  if (decision === 'approved') {
    try {
      await award(id, rows[0].referrer_id, rows[0].referee_id, settings, actorId);
    } catch (error) {
      await sql`UPDATE referrals SET status = 'review', decided_at = NULL, updated_at = NOW() WHERE id = ${id}`;
      throw error;
    }
  }
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

function mapReferral(r: any): Referral {
  return {
    id: r.id,
    referrer: { id: r.referrer_id, name: r.referrer_name },
    referee: { id: r.referee_id, name: r.referee_name },
    code: r.code,
    status: r.status,
    flags: r.flags ?? [],
    qualified_at: iso(r.qualified_at),
    qualified_by: r.qualified_by,
    decided_at: iso(r.decided_at),
    reject_reason: r.reject_reason,
    referrer_points: Number(r.referrer_points),
    referee_points: Number(r.referee_points),
    created_at: iso(r.created_at)!,
  };
}

export async function listReferrals(status: ReferralStatus | 'all'): Promise<Referral[]> {
  const select = sql`
    SELECT r.*, a.name AS referrer_name, b.name AS referee_name
    FROM referrals r JOIN users a ON a.id = r.referrer_id JOIN users b ON b.id = r.referee_id
  `;
  const rows =
    status === 'all'
      ? await sql`${select} ORDER BY r.created_at DESC LIMIT 500`
      : await sql`${select} WHERE r.status = ${status} ORDER BY r.created_at DESC LIMIT 500`;
  return rows.map(mapReferral);
}

export async function countReferralsToReview(): Promise<number> {
  const rows = await sql`SELECT COUNT(*) AS n FROM referrals WHERE status = 'review'`;
  return Number(rows[0].n);
}

export async function getMemberReferralSummary(userId: string, origin: string): Promise<MemberReferralSummary> {
  const { open, settings } = await getReferralConfig();
  if (!open) return { open: false, code: null, link: null, referrer_points: settings.referrer_points, joined: 0, approved: 0, points_earned: 0 };
  const code = await getOrCreateReferralCode(userId);
  const rows = await sql`
    SELECT COUNT(*) AS joined, COUNT(*) FILTER (WHERE status = 'approved') AS approved,
      COALESCE(SUM(referrer_points) FILTER (WHERE status = 'approved'), 0) AS earned
    FROM referrals WHERE referrer_id = ${userId}
  `;
  return {
    open: true,
    code,
    link: `${origin}/membership?ref=${code}#join`,
    referrer_points: settings.referrer_points,
    joined: Number(rows[0].joined),
    approved: Number(rows[0].approved),
    points_earned: Number(rows[0].earned),
  };
}
