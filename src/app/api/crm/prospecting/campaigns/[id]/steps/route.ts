import { NextRequest } from 'next/server';
import { crmContext, parseBody } from '@/lib/crm/route-helpers';
import { stepsSchema } from '@/lib/prospecting/schemas';
import { getCampaign, replaceSteps } from '@/lib/db/repositories/prospecting';
import type { ProspectStep } from '@/lib/prospecting/types';
import { ApiErrors, successResponse } from '@/lib/utils/api-response';
import { isValidUUID } from '@/lib/utils/validation';

export const dynamic = 'force-dynamic';

// PUT /api/crm/prospecting/campaigns/[id]/steps { steps } - save the whole sequence
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await crmContext('crm.edit');
  if ('response' in ctx) return ctx.response;
  const { id } = await params;
  if (!isValidUUID(id)) return ApiErrors.NotFound('Campaign');
  const body = await parseBody(request, stepsSchema);
  if ('response' in body) return body.response;

  try {
    if (!(await getCampaign(ctx.scope, id))) return ApiErrors.NotFound('Campaign');
    await replaceSteps(id, body.data.steps as ProspectStep[]);
    return successResponse(await getCampaign(ctx.scope, id), 'Sequence saved');
  } catch (error) {
    console.error('Error saving steps:', error);
    return ApiErrors.ServerError('Failed to save the sequence');
  }
}
