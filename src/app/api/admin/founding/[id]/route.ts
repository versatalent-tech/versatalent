import { NextRequest } from 'next/server';
import { z } from 'zod';
import { requireTeamPermission } from '@/lib/middleware/auth';
import { parseBody } from '@/lib/crm/route-helpers';
import { clearFoundingRefundFlag, endMembership, getPaidMembership } from '@/lib/db/repositories/founding';
import { logAudit } from '@/lib/db/repositories/audit-log';
import { ApiErrors, successResponse } from '@/lib/utils/api-response';
import { isValidUUID } from '@/lib/utils/validation';

const note = z.string().trim().max(300).optional().transform((v) => (v ? v : null));
const schema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('cancel'), note }),
  z.object({ action: z.literal('refunded'), note }),
  z.object({ action: z.literal('refund_done') }),
]);

/**
 * POST /api/admin/founding/[id]
 * - cancel: stop the membership now (e.g. cancelled within 14 days)
 * - refunded: you've refunded it in SumUp; benefits stop now
 * - refund_done: an extra payment flagged for refund has been refunded
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireTeamPermission('venue.manage');
  if ('response' in auth) return auth.response;
  const { id } = await params;
  if (!isValidUUID(id)) return ApiErrors.NotFound('Membership');
  const body = await parseBody(request, schema);
  if ('response' in body) return body.response;

  try {
    const before = await getPaidMembership(id);
    if (!before) return ApiErrors.NotFound('Membership');
    const actorId = auth.session.userId ?? null;
    const input = body.data;

    const changed =
      input.action === 'refund_done'
        ? await clearFoundingRefundFlag(id, actorId)
        : await endMembership(id, input.action === 'cancel' ? 'cancelled' : 'refunded', input.note, actorId);
    if (!changed) return ApiErrors.BadRequest('This membership can’t be changed that way now. Refresh and check its status.');

    const after = await getPaidMembership(id);
    await logAudit({ userId: auth.session.userId, name: auth.session.name }, input.action, 'paid_membership', id, {
      before: { status: before.status, ends_at: before.ends_at, needs_refund: before.needs_refund },
      after: { status: after?.status, ends_at: after?.ends_at, needs_refund: after?.needs_refund },
    });
    return successResponse(after, 'Saved');
  } catch (error) {
    console.error('Error updating Founding Membership:', error);
    return ApiErrors.ServerError('Failed to save');
  }
}
