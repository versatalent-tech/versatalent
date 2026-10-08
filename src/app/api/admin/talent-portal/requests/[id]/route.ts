import { NextRequest } from 'next/server';
import { requireTeamPermission } from '@/lib/middleware/auth';
import { parseBody } from '@/lib/crm/route-helpers';
import { reviewSchema } from '@/lib/portal/schemas';
import { reviewProfileChange } from '@/lib/db/repositories/portal';
import { logAudit } from '@/lib/db/repositories/audit-log';
import { ApiErrors, successResponse } from '@/lib/utils/api-response';
import { isValidUUID } from '@/lib/utils/validation';

// POST /api/admin/talent-portal/requests/[id] - approve (publishes the changes) or reject
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireTeamPermission('portal.manage');
  if ('response' in auth) return auth.response;
  const { id } = await params;
  if (!isValidUUID(id)) return ApiErrors.NotFound('Request');
  const body = await parseBody(request, reviewSchema);
  if ('response' in body) return body.response;

  try {
    const result = await reviewProfileChange(auth.session.userId ?? null, id, body.data.decision!, body.data.note ?? null);
    if (!result) return ApiErrors.BadRequest('This request has already been handled or was withdrawn');
    await logAudit({ userId: auth.session.userId, name: auth.session.name }, `profile_${body.data.decision}`, 'talent', result.talent.id, {
      after: result.changes,
    });
    return successResponse(result, body.data.decision === 'approved' ? 'Published' : 'Rejected');
  } catch (error) {
    console.error('Error reviewing profile request:', error);
    return ApiErrors.ServerError('Failed to save the decision');
  }
}
