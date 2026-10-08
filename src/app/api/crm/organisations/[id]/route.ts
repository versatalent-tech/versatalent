import { NextRequest } from 'next/server';
import { crmContext, parseBody } from '@/lib/crm/route-helpers';
import { organisationSchema } from '@/lib/crm/schemas';
import {
  deleteOrganisation,
  getOrganisation,
  isAssignableOwner,
  listContacts,
  listDealsForOrganisation,
  listTimeline,
  updateOrganisation,
} from '@/lib/db/repositories/crm';
import { logAudit } from '@/lib/db/repositories/audit-log';
import { can } from '@/lib/auth/permissions';
import { ApiErrors, successResponse } from '@/lib/utils/api-response';
import { isValidUUID } from '@/lib/utils/validation';

type Params = { params: Promise<{ id: string }> };

// GET /api/crm/organisations/[id] - client with contacts, deals and timeline
export async function GET(_request: NextRequest, { params }: Params) {
  const ctx = await crmContext('crm.view');
  if ('response' in ctx) return ctx.response;
  const { id } = await params;
  if (!isValidUUID(id)) return ApiErrors.NotFound('Client');

  try {
    const organisation = await getOrganisation(ctx.scope, id);
    if (!organisation) return ApiErrors.NotFound('Client');
    const [contacts, deals, timeline] = await Promise.all([
      listContacts(ctx.scope, { organisationId: id }),
      listDealsForOrganisation(ctx.scope, id),
      listTimeline(ctx.scope, { organisationId: id }),
    ]);
    return successResponse({ organisation, contacts, deals, timeline });
  } catch (error) {
    console.error('Error loading organisation:', error);
    return ApiErrors.ServerError('Failed to load client');
  }
}

// PATCH /api/crm/organisations/[id]
export async function PATCH(request: NextRequest, { params }: Params) {
  const ctx = await crmContext('crm.edit');
  if ('response' in ctx) return ctx.response;
  const { id } = await params;
  if (!isValidUUID(id)) return ApiErrors.NotFound('Client');
  const body = await parseBody(request, organisationSchema.partial());
  if ('response' in body) return body.response;

  try {
    if (body.data.owner_user_id && !(await isAssignableOwner(body.data.owner_user_id))) {
      return ApiErrors.BadRequest('The owner must be an active admin or manager');
    }
    const before = await getOrganisation(ctx.scope, id);
    if (!before || !(await updateOrganisation(ctx.scope, id, body.data))) return ApiErrors.NotFound('Client');
    const after = await getOrganisation(ctx.scope, id);
    await logAudit(ctx.actor, 'update', 'organisation', id, {
      before: { name: before.name, type: before.type },
      after: after && { name: after.name, type: after.type },
    });
    return successResponse(after, 'Client updated');
  } catch (error) {
    console.error('Error updating organisation:', error);
    return ApiErrors.ServerError('Failed to update client');
  }
}

// DELETE /api/crm/organisations/[id] - admins only; deals and contacts stay, unlinked
export async function DELETE(_request: NextRequest, { params }: Params) {
  const ctx = await crmContext('crm.edit');
  if ('response' in ctx) return ctx.response;
  if (!can(ctx.session.role, 'crm.delete')) return ApiErrors.Forbidden('Only admins can delete clients');
  const { id } = await params;
  if (!isValidUUID(id)) return ApiErrors.NotFound('Client');

  try {
    const organisation = await getOrganisation(ctx.scope, id);
    if (!organisation) return ApiErrors.NotFound('Client');
    await deleteOrganisation(id);
    await logAudit(ctx.actor, 'delete', 'organisation', id, { before: { name: organisation.name } });
    return successResponse(null, 'Client deleted');
  } catch (error) {
    console.error('Error deleting organisation:', error);
    return ApiErrors.ServerError('Failed to delete client');
  }
}
