import { sql } from '../client';

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
