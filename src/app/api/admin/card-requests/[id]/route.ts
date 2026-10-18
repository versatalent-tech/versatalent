import { NextRequest } from 'next/server';
import { z } from 'zod';
import { requireTeamPermission } from '@/lib/middleware/auth';
import { parseBody } from '@/lib/crm/route-helpers';
import { assignCard, cancelRequest, clearRefundFlag, getCardRequest, markPosted, waiveFee } from '@/lib/db/repositories/membership';
import { logAudit } from '@/lib/db/repositories/audit-log';
import { ApiErrors, successResponse } from '@/lib/utils/api-response';
import { isValidUUID } from '@/lib/utils/validation';

const optional = z.string().trim().max(200).optional().transform((v) => (v ? v : null));
const schema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('assign_card'), card_uid: z.string().trim().min(1, 'Tap or type the card UID') }),
  z.object({ action: z.literal('mark_posted'), tracking_reference: optional }),
  z.object({ action: z.literal('waive_fee') }),
  z.object({ action: z.literal('cancel'), note: optional, refunded: z.boolean().default(false) }),
  z.object({ action: z.literal('refund_done') }),
]);

/**
 * POST /api/admin/card-requests/[id] - move a card request along:
 * assign a card, mark posted, waive the fee, or cancel.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireTeamPermission('venue.manage');
  if ('response' in auth) return auth.response;
  const { id } = await params;
  if (!isValidUUID(id)) return ApiErrors.NotFound('Card request');
  const body = await parseBody(request, schema);
  if ('response' in body) return body.response;

  const actor = { userId: auth.session.userId, name: auth.session.name };
  const data = body.data as z.infer<typeof schema>;

  try {
    let ok = true;
    let error = 'This request can’t be changed in its current state';
    if (data.action === 'assign_card') {
      const result = await assignCard(id, data.card_uid, actor.userId ?? null);
      ok = result.ok;
      if ('error' in result) error = result.error;
    } else if (data.action === 'mark_posted') {
      ok = await markPosted(id, data.tracking_reference ?? null, actor.userId ?? null);
      error = 'Assign a card before marking it posted';
    } else if (data.action === 'waive_fee') {
      ok = await waiveFee(id, actor.userId ?? null);
      error = 'Only unpaid applications can have the fee waived';
    } else if (data.action === 'refund_done') {
      ok = await clearRefundFlag(id, actor.userId ?? null);
      error = 'There is no refund to clear';
    } else {
      ok = await cancelRequest(id, data.note ?? null, data.refunded ?? false, actor.userId ?? null);
      error = 'Posted or already cancelled requests can’t be cancelled';
    }
    if (!ok) return ApiErrors.BadRequest(error);

    await logAudit(actor, `card_request_${data.action}`, 'card_request', id, { after: data });
    return successResponse(await getCardRequest(id));
  } catch (err) {
    console.error('Error updating card request:', err);
    return ApiErrors.ServerError('Failed to update the card request');
  }
}
