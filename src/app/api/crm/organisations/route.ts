import { NextRequest } from 'next/server';
import { crmContext, parseBody } from '@/lib/crm/route-helpers';
import { organisationSchema } from '@/lib/crm/schemas';
import {
  createOrganisation,
  findVisibleOrganisationByName,
  getOrganisation,
  isAssignableOwner,
  listOrganisations,
} from '@/lib/db/repositories/crm';
import { logAudit } from '@/lib/db/repositories/audit-log';
import { ApiErrors, successResponse } from '@/lib/utils/api-response';

export const dynamic = 'force-dynamic';

// GET /api/crm/organisations?q= - clients the person can see
export async function GET(request: NextRequest) {
  const ctx = await crmContext('crm.view');
  if ('response' in ctx) return ctx.response;
  try {
    return successResponse(await listOrganisations(ctx.scope, request.nextUrl.searchParams.get('q') ?? undefined));
  } catch (error) {
    console.error('Error listing organisations:', error);
    return ApiErrors.ServerError('Failed to load clients');
  }
}

// POST /api/crm/organisations - add a client
export async function POST(request: NextRequest) {
  const ctx = await crmContext('crm.edit');
  if ('response' in ctx) return ctx.response;
  const body = await parseBody(request, organisationSchema);
  if ('response' in body) return body.response;

  try {
    if (body.data.owner_user_id && !(await isAssignableOwner(body.data.owner_user_id))) {
      return ApiErrors.BadRequest('The owner must be an active admin or manager');
    }
    const existing = await findVisibleOrganisationByName(ctx.scope, body.data.name);
    if (existing) return ApiErrors.BadRequest(`“${existing.name}” is already in your clients`);

    const id = await createOrganisation(ctx.actor, body.data);
    await logAudit(ctx.actor, 'create', 'organisation', id, { after: { name: body.data.name } });
    return successResponse(await getOrganisation(ctx.scope, id), 'Client added', 201);
  } catch (error) {
    console.error('Error creating organisation:', error);
    return ApiErrors.ServerError('Failed to add client');
  }
}
