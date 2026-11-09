import { NextRequest } from 'next/server';
import { z } from 'zod';
import { requireTeamPermission } from '@/lib/middleware/auth';
import { parseBody } from '@/lib/crm/route-helpers';
import { removeStaffShare } from '@/lib/db/repositories/staff-shares';
import { logAudit } from '@/lib/db/repositories/audit-log';
import { ApiErrors, successResponse } from '@/lib/utils/api-response';

const schema = z.object({ booking_id: z.string().uuid(), user_id: z.string().uuid() });

// POST /api/payouts/team/remove - remove an unpaid share, e.g. someone linked to the talent by mistake
export async function POST(request: NextRequest) {
  const auth = await requireTeamPermission('payouts.team');
  if ('response' in auth) return auth.response;
  const body = await parseBody(request, schema);
  if ('response' in body) return body.response;

  try {
    const { booking_id, user_id } = body.data;
    if (!(await removeStaffShare(booking_id!, user_id!))) {
      return ApiErrors.NotFound('Unpaid share (undo the payment first if it was paid)');
    }
    await logAudit({ userId: auth.session.userId, name: auth.session.name }, 'staff_share_removed', 'booking', booking_id!, {
      before: { user_id },
    });
    return successResponse(null, 'Share removed');
  } catch (error) {
    console.error('Error removing team share:', error);
    return ApiErrors.ServerError('Failed to remove the share');
  }
}
