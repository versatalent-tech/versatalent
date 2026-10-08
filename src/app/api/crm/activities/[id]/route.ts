import { NextRequest } from 'next/server';
import { crmContext, parseBody } from '@/lib/crm/route-helpers';
import { activityUpdateSchema } from '@/lib/crm/schemas';
import { deleteActivity, getActivity, isAssignableOwner, updateActivity } from '@/lib/db/repositories/crm';
import { can } from '@/lib/auth/permissions';
import { ApiErrors, successResponse } from '@/lib/utils/api-response';
import { isValidUUID } from '@/lib/utils/validation';

type Params = { params: Promise<{ id: string }> };

// PATCH /api/crm/activities/[id] - tick off / reopen a task, or edit it
export async function PATCH(request: NextRequest, { params }: Params) {
  const ctx = await crmContext('crm.edit');
  if ('response' in ctx) return ctx.response;
  const { id } = await params;
  if (!isValidUUID(id)) return ApiErrors.NotFound('Activity');
  const body = await parseBody(request, activityUpdateSchema);
  if ('response' in body) return body.response;

  try {
    if (body.data.owner_user_id && !(await isAssignableOwner(body.data.owner_user_id))) {
      return ApiErrors.BadRequest('Tasks can be given to admins and managers');
    }
    if (!(await updateActivity(ctx.scope, id, body.data))) return ApiErrors.NotFound('Activity');
    return successResponse(await getActivity(ctx.scope, id), 'Saved');
  } catch (error) {
    console.error('Error updating activity:', error);
    return ApiErrors.ServerError('Failed to save');
  }
}

// DELETE /api/crm/activities/[id] - by whoever logged it, or an admin. Automatic entries stay.
export async function DELETE(_request: NextRequest, { params }: Params) {
  const ctx = await crmContext('crm.edit');
  if ('response' in ctx) return ctx.response;
  const { id } = await params;
  if (!isValidUUID(id)) return ApiErrors.NotFound('Activity');

  try {
    const activity = await getActivity(ctx.scope, id);
    if (!activity) return ApiErrors.NotFound('Activity');
    const isAuthor = activity.created_by !== null && activity.created_by === ctx.actor.userId;
    if (!isAuthor && !can(ctx.session.role, 'crm.delete')) {
      return ApiErrors.Forbidden('Only the person who logged this, or an admin, can delete it');
    }
    await deleteActivity(id);
    return successResponse(null, 'Deleted');
  } catch (error) {
    console.error('Error deleting activity:', error);
    return ApiErrors.ServerError('Failed to delete');
  }
}
