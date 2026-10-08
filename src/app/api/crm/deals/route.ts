import { NextRequest } from 'next/server';
import { crmContext, parseBody } from '@/lib/crm/route-helpers';
import { dealSchema } from '@/lib/crm/schemas';
import { createDeal, getDeal, listDeals } from '@/lib/db/repositories/crm';
import { checkDealLinks } from '@/lib/crm/deal-links';
import { logAudit } from '@/lib/db/repositories/audit-log';
import { ApiErrors, successResponse } from '@/lib/utils/api-response';
import { isValidUUID } from '@/lib/utils/validation';

export const dynamic = 'force-dynamic';

// GET /api/crm/deals?q=&owner=me|<uuid> - deals for the pipeline board
export async function GET(request: NextRequest) {
  const ctx = await crmContext('crm.view');
  if ('response' in ctx) return ctx.response;

  const owner = request.nextUrl.searchParams.get('owner');
  const ownerId = owner === 'me' ? ctx.scope.userId ?? undefined : owner && isValidUUID(owner) ? owner : undefined;

  try {
    const deals = await listDeals(ctx.scope, { ownerId, q: request.nextUrl.searchParams.get('q') ?? undefined });
    return successResponse(deals);
  } catch (error) {
    console.error('Error listing deals:', error);
    return ApiErrors.ServerError('Failed to load deals');
  }
}

// POST /api/crm/deals - create a deal
export async function POST(request: NextRequest) {
  const ctx = await crmContext('crm.edit');
  if ('response' in ctx) return ctx.response;

  const body = await parseBody(request, dealSchema);
  if ('response' in body) return body.response;

  try {
    const problem = await checkDealLinks(ctx.scope, body.data);
    if (problem) return ApiErrors.BadRequest(problem);

    const id = await createDeal(ctx.actor, body.data);
    await logAudit(ctx.actor, 'create', 'deal', id, { after: { title: body.data.title, stage: body.data.stage } });
    return successResponse(await getDeal(ctx.scope, id), 'Deal created', 201);
  } catch (error) {
    console.error('Error creating deal:', error);
    return ApiErrors.ServerError('Failed to create deal');
  }
}
