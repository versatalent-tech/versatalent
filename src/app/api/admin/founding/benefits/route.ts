import { NextRequest } from 'next/server';
import { requireTeamPermission } from '@/lib/middleware/auth';
import { parseBody } from '@/lib/crm/route-helpers';
import { benefitSchema } from '@/lib/membership/schemas';
import { createBenefit, listBenefits } from '@/lib/db/repositories/founding';
import { logAudit } from '@/lib/db/repositories/audit-log';
import { ApiErrors, successResponse } from '@/lib/utils/api-response';

export const dynamic = 'force-dynamic';

// GET /api/admin/founding/benefits
export async function GET() {
  const auth = await requireTeamPermission('venue.manage');
  if ('response' in auth) return auth.response;
  try {
    return successResponse(await listBenefits());
  } catch (error) {
    console.error('Error loading benefits:', error);
    return ApiErrors.ServerError('Failed to load');
  }
}

// POST /api/admin/founding/benefits - add a benefit (applies to purchases from now on)
export async function POST(request: NextRequest) {
  const auth = await requireTeamPermission('venue.manage');
  if ('response' in auth) return auth.response;
  const body = await parseBody(request, benefitSchema);
  if ('response' in body) return body.response;
  try {
    const benefit = await createBenefit(body.data as any, auth.session.userId ?? null);
    await logAudit({ userId: auth.session.userId, name: auth.session.name }, 'create', 'membership_benefit', benefit.id, { after: benefit });
    return successResponse(benefit, 'Benefit added');
  } catch (error) {
    console.error('Error adding benefit:', error);
    return ApiErrors.ServerError('Failed to save');
  }
}
