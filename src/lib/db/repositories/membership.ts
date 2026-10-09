import { randomUUID } from 'crypto';
import { sql } from '../client';
import { createNFCCard, getNFCCardByUID } from './nfc-cards';
import { createVIPMembership, getVIPMembershipByUserId } from './vip-memberships';
import type { ApplicationInput } from '@/lib/membership/schemas';
import {
  ageOn,
  ageRangeFor,
  normaliseUkPostcode,
  type ApplicationStatus,
  type CardRequest,
  type CardRequestStatus,
  type ProgrammeSettings,
} from '@/lib/membership/types';

/**
 * Public membership sign-up and card fulfilment.
 *
 * An application creates a VIP member account (no password), their profile
 * and a card request. The request stays "awaiting payment" until SumUp
 * confirms the delivery fee; then the member's Silver membership starts and
 * staff assign, write and post their card.
 */

function iso(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  return value instanceof Date ? value.toISOString() : String(value);
}

// ---------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------

const DEFAULT_SETTINGS: ProgrammeSettings = { signup_open: false, card_delivery_fee_cents: 299, terms_version: '2026-10-draft' };

export async function getProgrammeSettings(): Promise<ProgrammeSettings> {
  const rows = await sql`SELECT key, value FROM programme_settings`;
  const values = Object.fromEntries(rows.map((r: any) => [r.key, r.value]));
  return {
    signup_open: values.signup_open === true,
    card_delivery_fee_cents: Number.isInteger(values.card_delivery_fee_cents) ? values.card_delivery_fee_cents : DEFAULT_SETTINGS.card_delivery_fee_cents,
    terms_version: typeof values.terms_version === 'string' ? values.terms_version : DEFAULT_SETTINGS.terms_version,
  };
}

export async function updateProgrammeSettings(changes: Partial<ProgrammeSettings>, userId: string | null): Promise<ProgrammeSettings> {
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
  return getProgrammeSettings();
}

// ---------------------------------------------------------------------------
// Applications
// ---------------------------------------------------------------------------

export type ApplicationResult =
  | { ok: true; requestId: string; feeCents: number; resumed: boolean }
  | { ok: false; reason: 'email_in_use' };

/**
 * Create (or, for someone who started but never paid, update) an
 * application. Anyone else already using the email is refused without
 * saying why, so the form can't be used to check who is a member.
 */
export async function submitApplication(input: ApplicationInput, settings: ProgrammeSettings): Promise<ApplicationResult> {
  const postcode = normaliseUkPostcode(input.postcode)!;
  const name = `${input.first_name} ${input.last_name}`;
  const ageRange = ageRangeFor(ageOn(input.date_of_birth));
  const consentChanged = input.consent_email || input.consent_sms || input.consent_post;

  const existing = await sql`
    SELECT u.id, u.role,
      (SELECT id FROM card_requests r WHERE r.user_id = u.id AND r.status = 'awaiting_payment' AND r.payment_status <> 'paid' LIMIT 1) AS unpaid_request,
      (SELECT COUNT(*) FROM card_requests r WHERE r.user_id = u.id AND r.payment_status IN ('paid', 'waived')) AS paid_requests
    FROM users u WHERE u.email = ${input.email} LIMIT 1
  `;
  const user = existing[0];

  const profile = (userId: string) => sql`
    INSERT INTO vip_profiles (
      user_id, phone, age_range, date_of_birth, address_line1, address_line2, city, postcode, country, interests,
      referral_source, consent_email, consent_sms, consent_post, consent_updated_at, terms_accepted_at, terms_version,
      founding_interest, signup_source
    ) VALUES (
      ${userId}, ${input.phone}, ${ageRange}, ${input.date_of_birth}, ${input.address_line1}, ${input.address_line2 || null},
      ${input.city}, ${postcode}, 'United Kingdom', ${input.interests}, ${input.referral_source ?? null},
      ${input.consent_email}, ${input.consent_sms}, ${input.consent_post}, ${consentChanged ? new Date().toISOString() : null},
      NOW(), ${settings.terms_version}, ${input.founding_interest}, 'website'
    )
    ON CONFLICT (user_id) DO UPDATE SET
      phone = EXCLUDED.phone, age_range = EXCLUDED.age_range, date_of_birth = EXCLUDED.date_of_birth,
      address_line1 = EXCLUDED.address_line1, address_line2 = EXCLUDED.address_line2, city = EXCLUDED.city,
      postcode = EXCLUDED.postcode, country = EXCLUDED.country, interests = EXCLUDED.interests,
      referral_source = EXCLUDED.referral_source, consent_email = EXCLUDED.consent_email,
      consent_sms = EXCLUDED.consent_sms, consent_post = EXCLUDED.consent_post,
      consent_updated_at = NOW(), terms_accepted_at = NOW(), terms_version = EXCLUDED.terms_version,
      founding_interest = EXCLUDED.founding_interest
  `;

  // Started before but never paid: let them try again with fresh details
  if (user && user.role === 'vip' && user.unpaid_request && Number(user.paid_requests) === 0) {
    await sql.transaction([
      sql`UPDATE users SET name = ${name}, updated_at = NOW() WHERE id = ${user.id}`,
      profile(user.id),
      sql`
        UPDATE card_requests SET recipient_name = ${name}, address_line1 = ${input.address_line1},
          address_line2 = ${input.address_line2 || null}, city = ${input.city}, postcode = ${postcode},
          fee_cents = ${settings.card_delivery_fee_cents}, updated_at = NOW()
        WHERE id = ${user.unpaid_request}
      `,
    ]);
    return { ok: true, requestId: user.unpaid_request, feeCents: settings.card_delivery_fee_cents, resumed: true };
  }
  if (user) return { ok: false, reason: 'email_in_use' };

  const userId = randomUUID();
  const requestId = randomUUID();
  await sql.transaction([
    sql`INSERT INTO users (id, name, email, role, is_active) VALUES (${userId}, ${name}, ${input.email}, 'vip', true)`,
    profile(userId),
    sql`
      INSERT INTO card_requests (id, user_id, recipient_name, address_line1, address_line2, city, postcode, fee_cents)
      VALUES (${requestId}, ${userId}, ${name}, ${input.address_line1}, ${input.address_line2 || null}, ${input.city},
              ${postcode}, ${settings.card_delivery_fee_cents})
    `,
  ]);
  return { ok: true, requestId, feeCents: settings.card_delivery_fee_cents, resumed: false };
}

export interface PaymentTarget {
  id: string;
  user_id: string;
  status: CardRequestStatus;
  payment_status: string;
  fee_cents: number;
  currency: string;
  sumup_checkout_id: string | null;
  sumup_checkout_reference: string | null;
  payment_attempts: number;
}

export async function getPaymentTarget(by: { requestId: string } | { checkoutId: string }): Promise<PaymentTarget | null> {
  const rows =
    'requestId' in by
      ? await sql`SELECT * FROM card_requests WHERE id = ${by.requestId} LIMIT 1`
      : await sql`SELECT * FROM card_requests WHERE sumup_checkout_id = ${by.checkoutId} LIMIT 1`;
  const r = rows[0];
  return r
    ? {
        id: r.id,
        user_id: r.user_id,
        status: r.status,
        payment_status: r.payment_status,
        fee_cents: Number(r.fee_cents),
        currency: r.currency,
        sumup_checkout_id: r.sumup_checkout_id,
        sumup_checkout_reference: r.sumup_checkout_reference,
        payment_attempts: Number(r.payment_attempts),
      }
    : null;
}

/**
 * Remember the checkout created for this attempt (only while still unpaid).
 * Every attempt is also kept in card_request_checkouts, so a payment made on
 * an older payment page is still recognised.
 */
export async function recordCheckout(
  target: Pick<PaymentTarget, 'id' | 'fee_cents' | 'currency'>,
  checkoutId: string,
  reference: string
): Promise<boolean> {
  const [, updated] = await sql.transaction([
    sql`
      INSERT INTO card_request_checkouts (checkout_id, request_id, reference, amount_cents, currency)
      VALUES (${checkoutId}, ${target.id}, ${reference}, ${target.fee_cents}, ${target.currency})
    `,
    sql`
      UPDATE card_requests SET sumup_checkout_id = ${checkoutId}, sumup_checkout_reference = ${reference},
        payment_attempts = payment_attempts + 1, payment_status = 'pending', updated_at = NOW()
      WHERE id = ${target.id} AND status = 'awaiting_payment' AND payment_status NOT IN ('paid', 'waived')
      RETURNING id
    `,
  ]);
  return (updated as unknown[]).length > 0;
}

export interface CheckoutRecord {
  checkout_id: string;
  request_id: string;
  reference: string;
  amount_cents: number;
  currency: string;
  outcome: string;
}

export async function getCheckoutRecord(checkoutId: string): Promise<CheckoutRecord | null> {
  const rows = await sql`SELECT * FROM card_request_checkouts WHERE checkout_id = ${checkoutId} LIMIT 1`;
  const r = rows[0];
  return r
    ? { checkout_id: r.checkout_id, request_id: r.request_id, reference: r.reference, amount_cents: Number(r.amount_cents), currency: r.currency, outcome: r.outcome }
    : null;
}

export async function setCheckoutOutcome(checkoutId: string, outcome: 'paid' | 'failed' | 'expired', transactionCode: string | null = null): Promise<void> {
  await sql`
    UPDATE card_request_checkouts SET outcome = ${outcome}, transaction_code = COALESCE(${transactionCode}, transaction_code), updated_at = NOW()
    WHERE checkout_id = ${checkoutId} AND outcome <> 'paid'
  `;
}

/**
 * Mark the fee paid. Only the first confirmation for the current checkout
 * changes anything, so webhook retries and page refreshes are harmless.
 * Returns true when this call made the change.
 */
export async function markCardFeePaid(requestId: string, checkoutId: string, transactionCode: string | null): Promise<boolean> {
  const rows = await sql`
    UPDATE card_requests SET payment_status = 'paid', status = 'to_post', paid_at = NOW(),
      sumup_checkout_id = ${checkoutId}, sumup_transaction_code = ${transactionCode}, updated_at = NOW()
    WHERE id = ${requestId} AND status = 'awaiting_payment' AND payment_status NOT IN ('paid', 'waived')
    RETURNING user_id
  `;
  if (rows.length > 0) {
    await startMembership(rows[0].user_id);
    return true;
  }

  // Not needed: already paid through another payment page, waived, or cancelled.
  // Flag it so the money is refunded (unless this very checkout is the one recorded).
  await sql`
    UPDATE card_requests SET needs_refund = true,
      notes = concat_ws(E'\n', notes, ${`Extra payment on SumUp checkout ${checkoutId}${transactionCode ? ` (${transactionCode})` : ''}: refund it in SumUp.`}::text),
      updated_at = NOW()
    WHERE id = ${requestId} AND sumup_checkout_id IS DISTINCT FROM ${checkoutId}::text AND needs_refund = false
  `;
  return false;
}

export async function clearRefundFlag(requestId: string, actorId: string | null): Promise<boolean> {
  const rows = await sql`
    UPDATE card_requests SET needs_refund = false, handled_by = ${actorId}, updated_at = NOW()
    WHERE id = ${requestId} AND needs_refund RETURNING id
  `;
  return rows.length > 0;
}

/** Failed or expired: only recorded against the current checkout, never over a payment */
export async function markCardFeeUnpaid(requestId: string, checkoutId: string, outcome: 'failed' | 'expired'): Promise<void> {
  await sql`
    UPDATE card_requests SET payment_status = ${outcome}, updated_at = NOW()
    WHERE id = ${requestId} AND sumup_checkout_id = ${checkoutId} AND payment_status = 'pending'
  `;
}

/** The free programme starts once the card is paid for (or the fee waived) */
async function startMembership(userId: string): Promise<void> {
  if (!(await getVIPMembershipByUserId(userId))) {
    try {
      await createVIPMembership(userId);
    } catch (error) {
      // A concurrent confirmation may have created it first
      if (!(await getVIPMembershipByUserId(userId))) throw error;
    }
  }
}

export async function getApplicationStatus(requestId: string): Promise<ApplicationStatus | null> {
  const rows = await sql`
    SELECT r.status, r.payment_status, r.postcode, r.fee_cents, u.name
    FROM card_requests r JOIN users u ON u.id = r.user_id
    WHERE r.id = ${requestId} LIMIT 1
  `;
  const r = rows[0];
  if (!r) return null;
  return {
    first_name: String(r.name).split(' ')[0],
    status: r.status,
    payment_status: r.payment_status,
    postcode_hint: `${String(r.postcode).split(' ')[0]} ••`,
    fee_cents: Number(r.fee_cents),
    can_retry_payment: r.status === 'awaiting_payment' && r.payment_status !== 'paid',
  };
}

// ---------------------------------------------------------------------------
// Admin: card fulfilment
// ---------------------------------------------------------------------------

function mapRequest(row: any): CardRequest {
  return {
    id: row.id,
    status: row.status,
    member: { id: row.user_id, name: row.member_name, email: row.member_email, phone: row.phone ?? null },
    recipient_name: row.recipient_name,
    address_line1: row.address_line1,
    address_line2: row.address_line2,
    city: row.city,
    postcode: row.postcode,
    country: row.country,
    fee_cents: Number(row.fee_cents),
    currency: row.currency,
    payment_status: row.payment_status,
    sumup_transaction_code: row.sumup_transaction_code,
    paid_at: iso(row.paid_at),
    card: row.nfc_card_id ? { id: row.nfc_card_id, uid: row.card_uid } : null,
    posted_at: iso(row.posted_at),
    tracking_reference: row.tracking_reference,
    notes: row.notes,
    founding_interest: Boolean(row.founding_interest),
    needs_refund: Boolean(row.needs_refund),
    created_at: iso(row.created_at)!,
  };
}

const requestSelect = () => sql`
  SELECT r.*, u.name AS member_name, u.email AS member_email, p.phone, p.founding_interest, c.card_uid
  FROM card_requests r
  JOIN users u ON u.id = r.user_id
  LEFT JOIN vip_profiles p ON p.user_id = r.user_id
  LEFT JOIN nfc_cards c ON c.id = r.nfc_card_id
`;

export async function listCardRequests(status: CardRequestStatus | 'open' | 'all'): Promise<CardRequest[]> {
  const rows =
    status === 'all'
      ? await sql`${requestSelect()} ORDER BY r.created_at DESC LIMIT 500`
      : status === 'open'
        ? await sql`${requestSelect()} WHERE r.status IN ('to_post', 'card_assigned') ORDER BY r.paid_at NULLS LAST, r.created_at LIMIT 500`
        : await sql`${requestSelect()} WHERE r.status = ${status} ORDER BY r.created_at DESC LIMIT 500`;
  return rows.map(mapRequest);
}

export async function getCardRequest(id: string): Promise<CardRequest | null> {
  const rows = await sql`${requestSelect()} WHERE r.id = ${id} LIMIT 1`;
  return rows[0] ? mapRequest(rows[0]) : null;
}

export async function countCardRequests(): Promise<{ to_post: number; card_assigned: number; awaiting_payment: number; founding_interest: number }> {
  const rows = await sql`
    SELECT
      COUNT(*) FILTER (WHERE status = 'to_post') AS to_post,
      COUNT(*) FILTER (WHERE status = 'card_assigned') AS card_assigned,
      COUNT(*) FILTER (WHERE status = 'awaiting_payment') AS awaiting_payment,
      (SELECT COUNT(*) FROM vip_profiles WHERE founding_interest) AS founding_interest
    FROM card_requests
  `;
  const r = rows[0];
  return {
    to_post: Number(r.to_post),
    card_assigned: Number(r.card_assigned),
    awaiting_payment: Number(r.awaiting_payment),
    founding_interest: Number(r.founding_interest),
  };
}

export type AssignResult = { ok: true } | { ok: false; error: string };

/** Link a new NFC card (by its UID) to the member and mark the request ready to post */
export async function assignCard(requestId: string, cardUid: string, actorId: string | null): Promise<AssignResult> {
  const request = await getCardRequest(requestId);
  if (!request) return { ok: false, error: 'Request not found' };
  if (request.status !== 'to_post') return { ok: false, error: 'Only paid requests waiting to be posted can get a card' };

  const uid = cardUid.trim().toUpperCase();
  if (!/^[0-9A-F]{8,20}$/.test(uid)) return { ok: false, error: 'That doesn’t look like a card UID (8–20 hex characters)' };
  if (await getNFCCardByUID(uid)) return { ok: false, error: 'This card is already registered to someone' };

  const card = await createNFCCard({ card_uid: uid, user_id: request.member.id, type: 'vip' });
  const rows = await sql`
    UPDATE card_requests SET nfc_card_id = ${card.id}, status = 'card_assigned', handled_by = ${actorId}, updated_at = NOW()
    WHERE id = ${requestId} AND status = 'to_post'
    RETURNING id
  `;
  if (rows.length === 0) {
    await sql`DELETE FROM nfc_cards WHERE id = ${card.id}`;
    return { ok: false, error: 'This request changed while you were assigning; refresh and try again' };
  }
  return { ok: true };
}

export async function markPosted(requestId: string, trackingReference: string | null, actorId: string | null): Promise<boolean> {
  const rows = await sql`
    UPDATE card_requests SET status = 'posted', posted_at = NOW(), tracking_reference = ${trackingReference},
      handled_by = ${actorId}, updated_at = NOW()
    WHERE id = ${requestId} AND status = 'card_assigned'
    RETURNING id
  `;
  return rows.length > 0;
}

/** Waive the fee (e.g. a member signed up in person) and move the request on */
export async function waiveFee(requestId: string, actorId: string | null): Promise<boolean> {
  const rows = await sql`
    UPDATE card_requests SET payment_status = 'waived', status = 'to_post', handled_by = ${actorId}, updated_at = NOW()
    WHERE id = ${requestId} AND status = 'awaiting_payment'
    RETURNING user_id
  `;
  if (rows.length === 0) return false;
  await startMembership(rows[0].user_id);
  return true;
}

export async function cancelRequest(requestId: string, note: string | null, refunded: boolean, actorId: string | null): Promise<boolean> {
  const rows = await sql`
    UPDATE card_requests SET status = 'cancelled',
      payment_status = CASE WHEN ${refunded} AND payment_status = 'paid' THEN 'refunded' ELSE payment_status END,
      notes = COALESCE(${note}, notes), handled_by = ${actorId}, updated_at = NOW()
    WHERE id = ${requestId} AND status <> 'posted' AND status <> 'cancelled'
    RETURNING id
  `;
  return rows.length > 0;
}

/**
 * Privacy notice: applications never paid for are kept up to 6 months.
 * Deletes those applicants' accounts (profile and request go with them) when
 * nothing else is attached: no membership, cards, orders or check-ins.
 */
export async function purgeStaleApplications(): Promise<number> {
  const rows = await sql`
    DELETE FROM users u
    WHERE u.role = 'vip'
      AND EXISTS (SELECT 1 FROM card_requests r WHERE r.user_id = u.id)
      AND NOT EXISTS (
        SELECT 1 FROM card_requests r
        WHERE r.user_id = u.id AND (r.status <> 'awaiting_payment' OR r.created_at > NOW() - INTERVAL '6 months')
      )
      AND NOT EXISTS (SELECT 1 FROM vip_memberships m WHERE m.user_id = u.id)
      AND NOT EXISTS (SELECT 1 FROM nfc_cards c WHERE c.user_id = u.id)
      AND NOT EXISTS (SELECT 1 FROM pos_orders o WHERE o.customer_user_id = u.id)
      AND NOT EXISTS (SELECT 1 FROM checkins k WHERE k.user_id = u.id)
    RETURNING u.id
  `;
  return rows.length;
}
