import { NextRequest } from 'next/server';
import { requireTeamPermission } from '@/lib/middleware/auth';
import { parseBody } from '@/lib/crm/route-helpers';
import { setOrderArrived } from '@/lib/db/repositories/tickets';
import { refundTicketOrder } from '@/lib/services/ticket-payments';
import { ticketOrderActionSchema } from '@/lib/tickets/schemas';
import { logAudit } from '@/lib/db/repositories/audit-log';
import { ApiErrors, successResponse } from '@/lib/utils/api-response';
import { isValidUUID } from '@/lib/utils/validation';

/**
 * PATCH /api/admin/tickets/orders/[id]
 *   { action: 'refund', reason? } - after refunding in SumUp: mark it refunded, take back points
 *   { action: 'arrived', arrived } - tick off (or untick) on the door list
 */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireTeamPermission('venue.manage');
  if ('response' in auth) return auth.response;
  const { id } = await params;
  if (!isValidUUID(id)) return ApiErrors.NotFound('Order');
  const body = await parseBody(request, ticketOrderActionSchema);
  if ('response' in body) return body.response;
  const actor = { userId: auth.session.userId, name: auth.session.name };

  try {
    if (body.data.action === 'refund') {
      const reason = (body.data as { reason?: string | null }).reason ?? null;
      const result = await refundTicketOrder(id, reason, auth.session.userId ?? null);
      if (result.ok === false) return ApiErrors.BadRequest(result.error);
      await logAudit(actor, 'refund', 'ticket_order', id, { after: { reason, points_reversed: result.pointsReversed } });
      return successResponse({ points_reversed: result.pointsReversed }, 'Order refunded');
    }
    const arrived = (body.data as { arrived: boolean }).arrived;
    if (!(await setOrderArrived(id, arrived))) return ApiErrors.BadRequest('Only paid orders can be ticked off');
    return successResponse({ arrived });
  } catch (error) {
    console.error('Ticket order action failed:', error);
    return ApiErrors.ServerError('Couldn’t update the order');
  }
}
