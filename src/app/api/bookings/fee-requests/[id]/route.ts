import { NextRequest } from 'next/server';
import { z } from 'zod';
import { requireTeamPermission } from '@/lib/middleware/auth';
import { parseBody } from '@/lib/crm/route-helpers';
import { decideFeeRequest } from '@/lib/db/repositories/fee-requests';
import { logAudit } from '@/lib/db/repositories/audit-log';
import { ApiErrors, successResponse } from '@/lib/utils/api-response';
import { isValidUUID } from '@/lib/utils/validation';

type Params = { params: Promise<{ id: string }> };

const schema = z.object({
  decision: z.enum(['approve', 'reject']),
  note: z
    .string()
    .trim()
    .max(500)
    .transform((v) => (v === '' ? null : v))
    .nullable()
    .optional(),
});

// POST /api/bookings/fee-requests/[id] - approve (apply to the booking) or reject a manager's fee change
export async function POST(request: NextRequest, { params }: Params) {
  const auth = await requireTeamPermission('fees.approve');
  if ('response' in auth) return auth.response;
  const { id } = await params;
  if (!isValidUUID(id)) return ApiErrors.NotFound('Fee change');
  const body = await parseBody(request, schema);
  if ('response' in body) return body.response;

  const actor = { userId: auth.session.userId ?? null, name: auth.session.name ?? null };
  try {
    const decided = await decideFeeRequest(id, actor, body.data.decision!, body.data.note ?? null);
    if (!decided) return ApiErrors.NotFound('Waiting fee change');
    const { request: r, before } = decided;
    await logAudit(actor, body.data.decision === 'approve' ? 'fee_request_approved' : 'fee_request_rejected', 'booking', r.booking_id, {
      before,
      after: { fee_cents: r.fee_cents, commission_percent: r.commission_percent, currency: r.currency, note: r.decision_note },
    });
    return successResponse(r, body.data.decision === 'approve' ? 'Fee change approved' : 'Fee change not approved');
  } catch (error) {
    console.error('Error deciding fee request:', error);
    return ApiErrors.ServerError('Failed to save the decision');
  }
}
