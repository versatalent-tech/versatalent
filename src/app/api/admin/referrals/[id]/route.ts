import { NextRequest } from 'next/server';
import { z } from 'zod';
import { requireTeamPermission } from '@/lib/middleware/auth';
import { parseBody } from '@/lib/crm/route-helpers';
import { decideReferral } from '@/lib/db/repositories/referrals';
import { logAudit } from '@/lib/db/repositories/audit-log';
import { ApiErrors, successResponse } from '@/lib/utils/api-response';
import { isValidUUID } from '@/lib/utils/validation';

const schema = z.object({
  decision: z.enum(['approved', 'rejected']),
  reason: z.string().trim().max(300).optional(),
});

// POST /api/admin/referrals/[id] { decision, reason? } - approve (pays the points) or reject
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireTeamPermission('venue.manage');
  if ('response' in auth) return auth.response;
  const { id } = await params;
  if (!isValidUUID(id)) return ApiErrors.NotFound('Referral');
  const body = await parseBody(request, schema);
  if ('response' in body) return body.response;
  try {
    const result = await decideReferral(id, body.data.decision, auth.session.userId ?? null, body.data.reason || null);
    if ('error' in result) return ApiErrors.BadRequest(result.error);
    await logAudit({ userId: auth.session.userId, name: auth.session.name }, body.data.decision === 'approved' ? 'approve' : 'reject', 'referral', id, {
      after: { reason: body.data.reason || null },
    });
    return successResponse(null, body.data.decision === 'approved' ? 'Approved' : 'Rejected');
  } catch (error) {
    console.error('Error deciding referral:', error);
    return ApiErrors.ServerError('Failed to save');
  }
}
