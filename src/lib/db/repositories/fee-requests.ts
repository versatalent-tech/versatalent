import { sql } from '../client';
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
