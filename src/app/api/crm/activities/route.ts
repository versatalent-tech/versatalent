import { NextRequest } from 'next/server';
import { crmContext, parseBody } from '@/lib/crm/route-helpers';
import { activitySchema } from '@/lib/crm/schemas';
import {
  createActivity,
  getActivity,
  getContact,
  getDeal,
  getOrganisation,
  isAssignableOwner,
  listTasks,
} from '@/lib/db/repositories/crm';
import { ApiErrors, successResponse } from '@/lib/utils/api-response';
import { isValidUUID } from '@/lib/utils/validation';

export const dynamic = 'force-dynamic';

// GET /api/crm/activities?owner=me|all|<uuid> - tasks list
export async function GET(request: NextRequest) {
  const ctx = await crmContext('crm.view');
  if ('response' in ctx) return ctx.response;
  const owner = request.nextUrl.searchParams.get('owner') ?? 'me';
  const ownerId = owner === 'all' ? null : owner === 'me' ? ctx.scope.userId : isValidUUID(owner) ? owner : ctx.scope.userId;

  try {
    return successResponse(await listTasks(ctx.scope, ownerId));
  } catch (error) {
    console.error('Error listing tasks:', error);
    return ApiErrors.ServerError('Failed to load tasks');
  }
}

// POST /api/crm/activities - log a note/call/email/meeting, or add a task
export async function POST(request: NextRequest) {
  const ctx = await crmContext('crm.edit');
  if ('response' in ctx) return ctx.response;
  const body = await parseBody(request, activitySchema);
  if ('response' in body) return body.response;
  const data = body.data;

  try {
    if (data.deal_id && !(await getDeal(ctx.scope, data.deal_id))) return ApiErrors.BadRequest('Deal not found');
    if (data.organisation_id && !(await getOrganisation(ctx.scope, data.organisation_id))) {
      return ApiErrors.BadRequest('Client not found');
    }
    if (data.contact_id && !(await getContact(ctx.scope, data.contact_id))) return ApiErrors.BadRequest('Contact not found');
    if (data.owner_user_id && data.owner_user_id !== ctx.scope.userId && !(await isAssignableOwner(data.owner_user_id))) {
      return ApiErrors.BadRequest('Tasks can be given to admins and managers');
    }

    const id = await createActivity(ctx.actor, data);
    return successResponse(await getActivity(ctx.scope, id), 'Saved', 201);
  } catch (error) {
    console.error('Error creating activity:', error);
    return ApiErrors.ServerError('Failed to save');
  }
}
