import { NextRequest } from 'next/server';
import { crmContext, parseBody } from '@/lib/crm/route-helpers';
import { enquiryConvertSchema } from '@/lib/crm/schemas';
import { convertEnquiry, getEnquiry, isAssignableOwner, talentsAllowed } from '@/lib/db/repositories/crm';
import { logAudit } from '@/lib/db/repositories/audit-log';
import { ApiErrors, successResponse } from '@/lib/utils/api-response';
import { isValidUUID } from '@/lib/utils/validation';

// POST /api/crm/enquiries/[id]/convert - create client, contact and deal from an enquiry
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await crmContext('enquiries.view');
  if ('response' in ctx) return ctx.response;
  const { id } = await params;
  if (!isValidUUID(id)) return ApiErrors.NotFound('Enquiry');
  const body = await parseBody(request, enquiryConvertSchema);
  if ('response' in body) return body.response;

  try {
    const enquiry = await getEnquiry(id);
    if (!enquiry) return ApiErrors.NotFound('Enquiry');
    if (enquiry.form === 'talent') {
      return ApiErrors.BadRequest('Talent applications aren’t sales leads; archive them once reviewed');
    }
    if (!talentsAllowed(ctx.scope, body.data.talent_ids)) {
      return ApiErrors.BadRequest('You can only add talents assigned to you');
    }
    if (body.data.owner_user_id && !(await isAssignableOwner(body.data.owner_user_id))) {
      return ApiErrors.BadRequest('The owner must be an active admin or manager');
    }

    const result = await convertEnquiry(ctx.scope, ctx.actor, id, body.data);
    if ('error' in result) return ApiErrors.BadRequest(result.error);

    await logAudit(ctx.actor, 'convert', 'enquiry', id, { after: { deal_id: result.dealId } });
    return successResponse(result, 'Deal created', 201);
  } catch (error) {
    console.error('Error converting enquiry:', error);
    return ApiErrors.ServerError('Failed to convert enquiry');
  }
}
