import { NextRequest } from 'next/server';
import { requireTeamPermission } from '@/lib/middleware/auth';
import { clearStaffShare } from '@/lib/db/repositories/staff-shares';
import { logAudit } from '@/lib/db/repositories/audit-log';
import { ApiErrors, successResponse } from '@/lib/utils/api-response';
import { isValidUUID } from '@/lib/utils/validation';

type Params = { params: Promise<{ bookingId: string; userId: string }> };

// DELETE /api/payouts/team/[bookingId]/[userId] - undo a recorded share payment
export async function DELETE(_request: NextRequest, { params }: Params) {
  const auth = await requireTeamPermission('payouts.team');
  if ('response' in auth) return auth.response;
  const { bookingId, userId } = await params;
  if (!isValidUUID(bookingId) || !isValidUUID(userId)) return ApiErrors.NotFound('Payment');

  try {
    if (!(await clearStaffShare(bookingId, userId))) return ApiErrors.NotFound('Payment');
    await logAudit({ userId: auth.session.userId, name: auth.session.name }, 'staff_share_cleared', 'booking', bookingId, {
      before: { user_id: userId },
    });
    return successResponse(null, 'Payment removed');
  } catch (error) {
    console.error('Error clearing team payout:', error);
    return ApiErrors.ServerError('Failed to remove the payment');
  }
}
