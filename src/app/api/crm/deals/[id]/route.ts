import { NextRequest } from 'next/server';
import { crmContext, parseBody } from '@/lib/crm/route-helpers';
import { dealSchema } from '@/lib/crm/schemas';
import { checkDealLinks } from '@/lib/crm/deal-links';
import { deleteDeal, getDeal, listTimeline, updateDeal } from '@/lib/db/repositories/crm';
import { logAudit } from '@/lib/db/repositories/audit-log';
import { can } from '@/lib/auth/permissions';
import { ApiErrors, successResponse } from '@/lib/utils/api-response';
import { isValidUUID } from '@/lib/utils/validation';

type Params = { params: Promise<{ id: string }> };

// GET /api/crm/deals/[id] - deal with its timeline
export async function GET(_request: NextRequest, { params }: Params) {
  const ctx = await crmContext('crm.view');
  if ('response' in ctx) return ctx.response;
  const { id } = await params;
  if (!isValidUUID(id)) return ApiErrors.NotFound('Deal');

  try {
    const deal = await getDeal(ctx.scope, id);
    if (!deal) return ApiErrors.NotFound('Deal');
    const timeline = await listTimeline(ctx.scope, { dealId: id });
    return successResponse({ deal, timeline });
  } catch (error) {
    console.error('Error loading deal:', error);
    return ApiErrors.ServerError('Failed to load deal');
  }
}

// PATCH /api/crm/deals/[id] - update any fields, including moving stage
export async function PATCH(request: NextRequest, { params }: Params) {
  const ctx = await crmContext('crm.edit');
  if ('response' in ctx) return ctx.response;
  const { id } = await params;
  if (!isValidUUID(id)) return ApiErrors.NotFound('Deal');

  const body = await parseBody(request, dealSchema.partial());
  if ('response' in body) return body.response;

  try {
    const before = await getDeal(ctx.scope, id);
    if (!before) return ApiErrors.NotFound('Deal');

    const problem = await checkDealLinks(ctx.scope, body.data, before.talents.map((t) => t.id));
    if (problem) return ApiErrors.BadRequest(problem);

    await updateDeal(ctx.scope, ctx.actor, id, body.data);
    const after = await getDeal(ctx.scope, id);
    await logAudit(ctx.actor, 'update', 'deal', id, {
      before: { stage: before.stage, value_cents: before.value_cents, owner: before.owner?.name ?? null },
      after: after && { stage: after.stage, value_cents: after.value_cents, owner: after.owner?.name ?? null },
    });
    return successResponse(after, 'Deal updated');
  } catch (error) {
    console.error('Error updating deal:', error);
    return ApiErrors.ServerError('Failed to update deal');
  }
}

// DELETE /api/crm/deals/[id] - admins only; prefer marking a deal as lost
export async function DELETE(_request: NextRequest, { params }: Params) {
  const ctx = await crmContext('crm.edit');
  if ('response' in ctx) return ctx.response;
  if (!can(ctx.session.role, 'crm.delete')) return ApiErrors.Forbidden('Only admins can delete deals');
  const { id } = await params;
  if (!isValidUUID(id)) return ApiErrors.NotFound('Deal');

  try {
    const deal = await getDeal(ctx.scope, id);
    if (!deal) return ApiErrors.NotFound('Deal');
    await deleteDeal(id);
    await logAudit(ctx.actor, 'delete', 'deal', id, { before: { title: deal.title, stage: deal.stage } });
    return successResponse(null, 'Deal deleted');
  } catch (error) {
    console.error('Error deleting deal:', error);
    return ApiErrors.ServerError('Failed to delete deal');
  }
}
