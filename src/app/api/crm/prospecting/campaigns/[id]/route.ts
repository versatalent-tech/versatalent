import { NextRequest } from 'next/server';
import { crmContext, parseBody } from '@/lib/crm/route-helpers';
import { campaignUpdateSchema } from '@/lib/prospecting/schemas';
import { deleteCampaign, getCampaign, updateCampaign } from '@/lib/db/repositories/prospecting';
import { isAssignableOwner, talentsAllowed } from '@/lib/db/repositories/crm';
import { logAudit } from '@/lib/db/repositories/audit-log';
import { can } from '@/lib/auth/permissions';
import { ApiErrors, successResponse } from '@/lib/utils/api-response';
import { isValidUUID } from '@/lib/utils/validation';

export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ id: string }> };

// GET /api/crm/prospecting/campaigns/[id] - campaign, sequence and the contacts in it the person can see
export async function GET(_request: NextRequest, { params }: Params) {
  const ctx = await crmContext('crm.view');
  if ('response' in ctx) return ctx.response;
  const { id } = await params;
  if (!isValidUUID(id)) return ApiErrors.NotFound('Campaign');
  try {
    const campaign = await getCampaign(ctx.scope, id);
    return campaign ? successResponse(campaign) : ApiErrors.NotFound('Campaign');
  } catch (error) {
    console.error('Error loading campaign:', error);
    return ApiErrors.ServerError('Failed to load the campaign');
  }
}

// PATCH /api/crm/prospecting/campaigns/[id] - details or status (start, pause, finish)
export async function PATCH(request: NextRequest, { params }: Params) {
  const ctx = await crmContext('crm.edit');
  if ('response' in ctx) return ctx.response;
  const { id } = await params;
  if (!isValidUUID(id)) return ApiErrors.NotFound('Campaign');
  const body = await parseBody(request, campaignUpdateSchema);
  if ('response' in body) return body.response;

  try {
    const before = await getCampaign(ctx.scope, id);
    if (!before) return ApiErrors.NotFound('Campaign');
    const added = body.data.talent_ids?.filter((t) => !before.talents.some((x) => x.id === t)) ?? [];
    if (!talentsAllowed(ctx.scope, added)) return ApiErrors.BadRequest('You can only add talents assigned to you');
    if (body.data.owner_user_id && !(await isAssignableOwner(body.data.owner_user_id))) {
      return ApiErrors.BadRequest('The owner must be an active admin or manager');
    }
    if (body.data.status === 'active' && before.steps.length === 0) return ApiErrors.BadRequest('Add at least one step first');

    await updateCampaign(id, body.data);
    await logAudit(ctx.actor, 'update', 'prospect_campaign', id, {
      before: { name: before.name, status: before.status },
      after: { name: body.data.name ?? before.name, status: body.data.status ?? before.status },
    });
    return successResponse(await getCampaign(ctx.scope, id), 'Saved');
  } catch (error) {
    console.error('Error updating campaign:', error);
    return ApiErrors.ServerError('Failed to save the campaign');
  }
}

// DELETE /api/crm/prospecting/campaigns/[id] - whoever created it, or an admin. Logged activities stay.
export async function DELETE(_request: NextRequest, { params }: Params) {
  const ctx = await crmContext('crm.edit');
  if ('response' in ctx) return ctx.response;
  const { id } = await params;
  if (!isValidUUID(id)) return ApiErrors.NotFound('Campaign');
  try {
    const campaign = await getCampaign(ctx.scope, id);
    if (!campaign) return ApiErrors.NotFound('Campaign');
    const isCreator = campaign.created_by !== null && campaign.created_by === ctx.actor.userId;
    if (!isCreator && !can(ctx.session.role, 'crm.delete')) {
      return ApiErrors.Forbidden('Only the person who created this campaign, or an admin, can delete it');
    }
    await deleteCampaign(id);
    await logAudit(ctx.actor, 'delete', 'prospect_campaign', id, { before: { name: campaign.name } });
    return successResponse(null, 'Campaign deleted');
  } catch (error) {
    console.error('Error deleting campaign:', error);
    return ApiErrors.ServerError('Failed to delete the campaign');
  }
}
