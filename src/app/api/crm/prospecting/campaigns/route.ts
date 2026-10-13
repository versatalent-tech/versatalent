import { NextRequest } from 'next/server';
import { crmContext, parseBody } from '@/lib/crm/route-helpers';
import { campaignSchema } from '@/lib/prospecting/schemas';
import { STARTER_STEPS } from '@/lib/prospecting/types';
import { createCampaign, getCampaign, listCampaigns } from '@/lib/db/repositories/prospecting';
import { isAssignableOwner, talentsAllowed } from '@/lib/db/repositories/crm';
import { logAudit } from '@/lib/db/repositories/audit-log';
import { ApiErrors, successResponse } from '@/lib/utils/api-response';

export const dynamic = 'force-dynamic';

// GET /api/crm/prospecting/campaigns - all campaigns with their figures
export async function GET() {
  const ctx = await crmContext('crm.view');
  if ('response' in ctx) return ctx.response;
  try {
    return successResponse(await listCampaigns());
  } catch (error) {
    console.error('Error listing campaigns:', error);
    return ApiErrors.ServerError('Failed to load campaigns');
  }
}

// POST /api/crm/prospecting/campaigns - new campaign (draft), with a starter sequence
export async function POST(request: NextRequest) {
  const ctx = await crmContext('crm.edit');
  if ('response' in ctx) return ctx.response;
  const body = await parseBody(request, campaignSchema);
  if ('response' in body) return body.response;

  try {
    if (!talentsAllowed(ctx.scope, body.data.talent_ids)) return ApiErrors.BadRequest('You can only add talents assigned to you');
    if (body.data.owner_user_id && !(await isAssignableOwner(body.data.owner_user_id))) {
      return ApiErrors.BadRequest('The owner must be an active admin or manager');
    }
    const id = await createCampaign(ctx.actor, body.data as { name: string; talent_ids: string[] }, STARTER_STEPS);
    await logAudit(ctx.actor, 'create', 'prospect_campaign', id, { after: { name: body.data.name } });
    return successResponse(await getCampaign(ctx.scope, id), 'Campaign created', 201);
  } catch (error) {
    console.error('Error creating campaign:', error);
    return ApiErrors.ServerError('Failed to create the campaign');
  }
}
