import { sql } from '../client';
import { updateBooking, type BookingActor } from './bookings';
import type { FeeMoney, FeeRequest, FeeRequestStatus } from '@/lib/bookings/types';

// ---------------------------------------------------------------------------
// Managers' fee and commission changes, waiting for an admin's approval
// ---------------------------------------------------------------------------

const requestSelect = () => sql`
  SELECT r.*, u.name AS requested_by_name
  FROM booking_fee_requests r
  LEFT JOIN users u ON u.id = r.requested_by
`;

const percent = (value: unknown) => (value === null || value === undefined ? null : Number(value));

function mapRequest(row: any): FeeRequest {
  return {
    id: row.id,
    booking_id: row.booking_id,
    status: row.status as FeeRequestStatus,
    fee_cents: row.fee_cents === null ? null : Number(row.fee_cents),
    commission_percent: percent(row.commission_percent),
    currency: row.currency,
    requested_by_name: row.requested_by_name ?? null,
    created_at: new Date(row.created_at).toISOString(),
    updated_at: new Date(row.updated_at).toISOString(),
    decided_at: row.decided_at ? new Date(row.decided_at).toISOString() : null,
    decision_note: row.decision_note ?? null,
  };
}

async function getFeeRequest(id: string): Promise<FeeRequest | null> {
  const rows = await sql`${requestSelect()} WHERE r.id = ${id}`;
  return rows[0] ? mapRequest(rows[0]) : null;
}

/**
 * Ask for the booking's money to change. If it's what the booking already has,
 * any waiting request is withdrawn (they changed their mind) and null returned;
 * otherwise the booking's waiting request is created or replaced.
 */
export async function requestFeeChange(bookingId: string, userId: string | null, money: FeeMoney): Promise<FeeRequest | null> {
  const [current] = await sql`SELECT fee_cents, commission_percent, currency FROM bookings WHERE id = ${bookingId}`;
  if (!current) return null;
  const unchanged =
    (current.fee_cents === null ? null : Number(current.fee_cents)) === money.fee_cents &&
    percent(current.commission_percent) === money.commission_percent &&
    current.currency === money.currency;
  if (unchanged) {
    await sql`UPDATE booking_fee_requests SET status = 'withdrawn', updated_at = NOW() WHERE booking_id = ${bookingId} AND status = 'pending'`;
    return null;
  }
  const rows = await sql`
    INSERT INTO booking_fee_requests (booking_id, requested_by, fee_cents, commission_percent, currency)
    VALUES (${bookingId}, ${userId}, ${money.fee_cents}, ${money.commission_percent}, ${money.currency})
    ON CONFLICT (booking_id) WHERE status = 'pending' DO UPDATE SET
      requested_by = EXCLUDED.requested_by,
      fee_cents = EXCLUDED.fee_cents,
      commission_percent = EXCLUDED.commission_percent,
      currency = EXCLUDED.currency,
      updated_at = NOW()
    RETURNING id
  `;
  return getFeeRequest(rows[0].id);
}

/** The booking's waiting request, else its latest decision from the last 30 days */
export async function latestFeeRequest(bookingId: string): Promise<FeeRequest | null> {
  const rows = await sql`
    ${requestSelect()}
    WHERE r.booking_id = ${bookingId}
      AND (r.status = 'pending' OR (r.status IN ('approved', 'rejected') AND r.decided_at > NOW() - INTERVAL '30 days'))
    ORDER BY (r.status = 'pending') DESC, r.decided_at DESC
    LIMIT 1
  `;
  return rows[0] ? mapRequest(rows[0]) : null;
}

export type PendingFeeRequest = FeeRequest & { booking_title: string; talent_name: string; starts_at: string; current: FeeMoney };

/** Waiting requests with each booking's money now (oldest first) */
export async function listPendingFeeRequests(): Promise<PendingFeeRequest[]> {
  const rows = await sql`
    SELECT r.*, u.name AS requested_by_name, b.title AS booking_title, t.name AS talent_name, b.starts_at,
      b.fee_cents AS current_fee_cents, b.commission_percent AS current_commission_percent, b.currency AS current_currency
    FROM booking_fee_requests r
    JOIN bookings b ON b.id = r.booking_id
    JOIN talents t ON t.id = b.talent_id
    LEFT JOIN users u ON u.id = r.requested_by
    WHERE r.status = 'pending'
    ORDER BY r.updated_at
    LIMIT 500
  `;
  return rows.map((row: any) => ({
    ...mapRequest(row),
    booking_title: row.booking_title,
    talent_name: row.talent_name,
    starts_at: new Date(row.starts_at).toISOString(),
    current: {
      fee_cents: row.current_fee_cents === null ? null : Number(row.current_fee_cents),
      commission_percent: percent(row.current_commission_percent),
      currency: row.current_currency,
    },
  }));
}

export async function countPendingFeeRequests(): Promise<number> {
  const rows = await sql`SELECT COUNT(*) AS n FROM booking_fee_requests WHERE status = 'pending'`;
  return Number(rows[0].n);
}

/**
 * Approve (apply the requested money to the booking through the normal update,
 * so talent pay and staff shares follow) or reject a waiting request. Returns
 * the decided request, with the booking's money before, or null when it isn't waiting.
 */
export async function decideFeeRequest(
  id: string,
  actor: BookingActor,
  decision: 'approve' | 'reject',
  note: string | null
): Promise<{ request: FeeRequest; before: FeeMoney } | null> {
  const [row] = await sql`
    SELECT r.*, b.fee_cents AS current_fee_cents, b.commission_percent AS current_commission_percent, b.currency AS current_currency
    FROM booking_fee_requests r JOIN bookings b ON b.id = r.booking_id
    WHERE r.id = ${id} AND r.status = 'pending'
  `;
  if (!row) return null;
  const before: FeeMoney = {
    fee_cents: row.current_fee_cents === null ? null : Number(row.current_fee_cents),
    commission_percent: percent(row.current_commission_percent),
    currency: row.current_currency,
  };
  if (decision === 'approve') {
    await updateBooking({ all: true, talentIds: [] }, actor, row.booking_id, {
      fee_cents: row.fee_cents === null ? null : Number(row.fee_cents),
      commission_percent: percent(row.commission_percent),
      currency: row.currency,
    });
  }
  const decided = await sql`
    UPDATE booking_fee_requests
    SET status = ${decision === 'approve' ? 'approved' : 'rejected'}, decided_by = ${actor.userId}, decided_at = NOW(),
      decision_note = ${note}, updated_at = NOW()
    WHERE id = ${id} AND status = 'pending'
    RETURNING id
  `;
  if (decided.length === 0) return null;
  const request = await getFeeRequest(id);
  return request ? { request, before } : null;
}

/** Withdraw the booking's waiting request; false when there's none */
export async function withdrawFeeRequest(bookingId: string): Promise<FeeRequest | null> {
  const rows = await sql`
    UPDATE booking_fee_requests SET status = 'withdrawn', updated_at = NOW()
    WHERE booking_id = ${bookingId} AND status = 'pending'
    RETURNING id
  `;
  return rows[0] ? getFeeRequest(rows[0].id) : null;
}
