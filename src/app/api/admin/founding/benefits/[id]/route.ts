import { NextRequest } from 'next/server';
import { requireTeamPermission } from '@/lib/middleware/auth';
import { parseBody } from '@/lib/crm/route-helpers';
import { benefitSchema } from '@/lib/membership/schemas';
import { getBenefit, updateBenefit } from '@/lib/db/repositories/founding';
import { logAudit } from '@/lib/db/repositories/audit-log';
import { ApiErrors, successResponse } from '@/lib/utils/api-response';
import { isValidUUID } from '@/lib/utils/validation';

/**
 * PUT /api/admin/founding/benefits/[id] - edit, pause or retire a benefit.
 * Changes apply to purchases made afterwards; existing members keep the
 * benefits they bought until their year ends.
 */
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireTeamPermission('venue.manage');
  if ('response' in auth) return auth.response;
  const { id } = await params;
  if (!isValidUUID(id)) return ApiErrors.NotFound('Benefit');
  const body = await parseBody(request, benefitSchema);
  if ('response' in body) return body.response;
  try {
    const before = await getBenefit(id);
    if (!before) return ApiErrors.NotFound('Benefit');
    const after = await updateBenefit(id, body.data as any, auth.session.userId ?? null);
    await logAudit({ userId: auth.session.userId, name: auth.session.name }, 'update', 'membership_benefit', id, { before, after });
    return successResponse(after, 'Saved');
  } catch (error) {
    console.error('Error saving benefit:', error);
    return ApiErrors.ServerError('Failed to save');
  }
}
