import { NextRequest } from 'next/server';
import { crmContext, parseBody } from '@/lib/crm/route-helpers';
import { enrolSchema } from '@/lib/prospecting/schemas';
import { enrolContacts, getCampaign } from '@/lib/db/repositories/prospecting';
import { ApiErrors, successResponse } from '@/lib/utils/api-response';
import { isValidUUID } from '@/lib/utils/validation';

export const dynamic = 'force-dynamic';

// POST /api/crm/prospecting/campaigns/[id]/enrol { contact_ids } - add contacts (do-not-contact ones are skipped)
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await crmContext('crm.edit');
  if ('response' in ctx) return ctx.response;
  const { id } = await params;
  if (!isValidUUID(id)) return ApiErrors.NotFound('Campaign');
  const body = await parseBody(request, enrolSchema);
  if ('response' in body) return body.response;

  try {
    const campaign = await getCampaign(ctx.scope, id);
    if (!campaign) return ApiErrors.NotFound('Campaign');
    if (campaign.status === 'done') return ApiErrors.BadRequest('This campaign has finished');
    const added = await enrolContacts(ctx.scope, ctx.actor, id, body.data.contact_ids);
    const skipped = body.data.contact_ids.length - added;
    const message = `${added} added${skipped > 0 ? `, ${skipped} skipped (already in, or do not contact)` : ''}`;
    return successResponse(await getCampaign(ctx.scope, id), message);
  } catch (error) {
    console.error('Error enrolling contacts:', error);
    return ApiErrors.ServerError('Failed to add the contacts');
  }
}
