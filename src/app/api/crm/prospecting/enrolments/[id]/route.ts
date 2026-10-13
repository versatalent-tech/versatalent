import { NextRequest } from 'next/server';
import { crmContext, parseBody } from '@/lib/crm/route-helpers';
import { enrolmentActionSchema } from '@/lib/prospecting/schemas';
import { completeStep, createDealFromEnrolment, recordOutcome, removeEnrolment } from '@/lib/db/repositories/prospecting';
import { ApiErrors, errorResponse, successResponse } from '@/lib/utils/api-response';
import { isValidUUID } from '@/lib/utils/validation';

export const dynamic = 'force-dynamic';

/**
 * POST /api/crm/prospecting/enrolments/[id]
 *   { action: 'step', step, outcome: 'sent' | 'skipped', message?, note? }  - step done, move on
 *   { action: 'outcome', outcome, note? }  - replied / meeting / not interested / bounced / unsubscribed
 *   { action: 'deal' }  - turn a reply or meeting into a deal
 *   { action: 'remove' }  - take them out (or stop them, once contacted)
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await crmContext('crm.edit');
  if ('response' in ctx) return ctx.response;
  const { id } = await params;
  if (!isValidUUID(id)) return ApiErrors.NotFound('Contact in campaign');
  const body = await parseBody(request, enrolmentActionSchema);
  if ('response' in body) return body.response;
  const data = body.data;

  try {
    switch (data.action) {
      case 'step': {
        const result = await completeStep(ctx.scope, ctx.actor, id, data as { step: number; outcome: 'sent' | 'skipped' });
        if (result === 'not_found') return ApiErrors.NotFound('Contact in campaign');
        if (result === 'stale') return errorResponse('This step was already done', 409, undefined, 'STALE');
        return successResponse(null, data.outcome === 'sent' ? 'Done' : 'Skipped');
      }
      case 'outcome':
        return (await recordOutcome(ctx.scope, ctx.actor, id, data.outcome, data.note ?? null))
          ? successResponse(null, 'Saved')
          : ApiErrors.NotFound('Contact in campaign');
      case 'deal': {
        const result = await createDealFromEnrolment(ctx.scope, ctx.actor, id);
        return 'error' in result ? ApiErrors.BadRequest(result.error) : successResponse(result, 'Deal created');
      }
      case 'remove':
        return (await removeEnrolment(ctx.scope, id)) ? successResponse(null, 'Removed') : ApiErrors.NotFound('Contact in campaign');
    }
  } catch (error) {
    console.error('Error updating enrolment:', error);
    return ApiErrors.ServerError('Failed to save');
  }
}
