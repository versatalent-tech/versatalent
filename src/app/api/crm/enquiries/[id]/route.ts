import { NextRequest } from 'next/server';
import { z } from 'zod';
import { crmContext, parseBody } from '@/lib/crm/route-helpers';
import { getEnquiry, setEnquiryStatus } from '@/lib/db/repositories/crm';
import { logAudit } from '@/lib/db/repositories/audit-log';
import { ApiErrors, successResponse } from '@/lib/utils/api-response';
import { isValidUUID } from '@/lib/utils/validation';

const statusSchema = z.object({ status: z.enum(['new', 'archived', 'spam']) });

// PATCH /api/crm/enquiries/[id] - archive, mark as spam, or move back to new
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await crmContext('enquiries.view');
  if ('response' in ctx) return ctx.response;
  const { id } = await params;
  if (!isValidUUID(id)) return ApiErrors.NotFound('Enquiry');
  const body = await parseBody(request, statusSchema);
  if ('response' in body) return body.response;

  try {
    if (!(await setEnquiryStatus(ctx.actor, id, body.data.status))) {
      return ApiErrors.BadRequest('This enquiry was converted to a deal and can’t be changed');
    }
    await logAudit(ctx.actor, `enquiry_${body.data.status}`, 'enquiry', id);
    return successResponse(await getEnquiry(id));
  } catch (error) {
    console.error('Error updating enquiry:', error);
    return ApiErrors.ServerError('Failed to update enquiry');
  }
}
