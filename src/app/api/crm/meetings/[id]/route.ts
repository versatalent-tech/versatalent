import { NextRequest } from 'next/server';
import { crmContext, parseBody } from '@/lib/crm/route-helpers';
import { meetingNotesSchema, meetingSchema } from '@/lib/crm/schemas';
import { checkMeetingLinks } from '@/lib/meetings/links';
import { deleteMeeting, getMeeting, saveMeetingNotes, updateMeeting } from '@/lib/db/repositories/meetings';
import { isTaskAssignee } from '@/lib/db/repositories/crm';
import { logAudit } from '@/lib/db/repositories/audit-log';
import { can } from '@/lib/auth/permissions';
import { ApiErrors, successResponse } from '@/lib/utils/api-response';
import { isValidUUID } from '@/lib/utils/validation';

export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ id: string }> };

// GET /api/crm/meetings/[id] - the meeting with its transcript and notes
export async function GET(_request: NextRequest, { params }: Params) {
  const ctx = await crmContext('crm.view');
  if ('response' in ctx) return ctx.response;
  const { id } = await params;
  if (!isValidUUID(id)) return ApiErrors.NotFound('Meeting');

  try {
    const meeting = await getMeeting(ctx.scope, id);
    return meeting ? successResponse(meeting) : ApiErrors.NotFound('Meeting');
  } catch (error) {
    console.error('Error loading meeting:', error);
    return ApiErrors.ServerError('Failed to load the meeting');
  }
}

// PUT /api/crm/meetings/[id] - edit the meeting's details
export async function PUT(request: NextRequest, { params }: Params) {
  const ctx = await crmContext('crm.edit');
  if ('response' in ctx) return ctx.response;
  const { id } = await params;
  if (!isValidUUID(id)) return ApiErrors.NotFound('Meeting');
  const body = await parseBody(request, meetingSchema);
  if ('response' in body) return body.response;

  try {
    const before = await getMeeting(ctx.scope, id);
    if (!before) return ApiErrors.NotFound('Meeting');
    const problem = await checkMeetingLinks(ctx.scope, body.data, before);
    if (problem) return ApiErrors.BadRequest(problem);

    await updateMeeting(id, body.data);
    await logAudit(ctx.actor, 'update', 'meeting', id, {
      before: { title: before.title, starts_at: before.starts_at },
      after: { title: body.data.title, starts_at: body.data.starts_at },
    });
    return successResponse(await getMeeting(ctx.scope, id), 'Meeting saved');
  } catch (error) {
    console.error('Error updating meeting:', error);
    return ApiErrors.ServerError('Failed to save the meeting');
  }
}

// PATCH /api/crm/meetings/[id] - save the transcript and/or the reviewed notes
export async function PATCH(request: NextRequest, { params }: Params) {
  const ctx = await crmContext('crm.edit');
  if ('response' in ctx) return ctx.response;
  const { id } = await params;
  if (!isValidUUID(id)) return ApiErrors.NotFound('Meeting');
  const body = await parseBody(request, meetingNotesSchema);
  if ('response' in body) return body.response;

  try {
    const current = await getMeeting(ctx.scope, id);
    if (!current) return ApiErrors.NotFound('Meeting');

    const owners = new Set((body.data.action_items ?? []).map((item) => item.owner_user_id).filter(Boolean) as string[]);
    for (const ownerId of owners) {
      if (!(await isTaskAssignee(ctx.scope, ownerId))) {
        return ApiErrors.BadRequest('Action items can be given to the team, road managers and your talents with a portal login');
      }
    }

    await saveMeetingNotes(ctx.actor, current, body.data);
    return successResponse(await getMeeting(ctx.scope, id), 'Saved');
  } catch (error) {
    console.error('Error saving meeting notes:', error);
    return ApiErrors.ServerError('Failed to save');
  }
}

// DELETE /api/crm/meetings/[id] - by whoever created it, or an admin. Tasks made from it stay.
export async function DELETE(_request: NextRequest, { params }: Params) {
  const ctx = await crmContext('crm.edit');
  if ('response' in ctx) return ctx.response;
  const { id } = await params;
  if (!isValidUUID(id)) return ApiErrors.NotFound('Meeting');

  try {
    const meeting = await getMeeting(ctx.scope, id);
    if (!meeting) return ApiErrors.NotFound('Meeting');
    const isCreator = meeting.created_by !== null && meeting.created_by === ctx.actor.userId;
    if (!isCreator && !can(ctx.session.role, 'crm.delete')) {
      return ApiErrors.Forbidden('Only the person who added this meeting, or an admin, can delete it');
    }
    await deleteMeeting(id);
    await logAudit(ctx.actor, 'delete', 'meeting', id, { before: { title: meeting.title, starts_at: meeting.starts_at } });
    return successResponse(null, 'Meeting deleted');
  } catch (error) {
    console.error('Error deleting meeting:', error);
    return ApiErrors.ServerError('Failed to delete the meeting');
  }
}
