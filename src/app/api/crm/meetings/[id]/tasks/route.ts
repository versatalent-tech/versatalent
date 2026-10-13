import { NextRequest } from 'next/server';
import { crmContext, parseBody } from '@/lib/crm/route-helpers';
import { meetingTasksSchema } from '@/lib/crm/schemas';
import { createTasksFromActionItems, getMeeting } from '@/lib/db/repositories/meetings';
import { ApiErrors, successResponse } from '@/lib/utils/api-response';
import { isValidUUID } from '@/lib/utils/validation';

export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ id: string }> };

// POST /api/crm/meetings/[id]/tasks { item_ids } - turn action items into CRM tasks (once each)
export async function POST(request: NextRequest, { params }: Params) {
  const ctx = await crmContext('crm.edit');
  if ('response' in ctx) return ctx.response;
  const { id } = await params;
  if (!isValidUUID(id)) return ApiErrors.NotFound('Meeting');
  const body = await parseBody(request, meetingTasksSchema);
  if ('response' in body) return body.response;

  try {
    if (!(await getMeeting(ctx.scope, id))) return ApiErrors.NotFound('Meeting');
    const created = await createTasksFromActionItems(ctx.actor, id, body.data.item_ids);
    const message = created === 0 ? 'Those action items are already tasks' : created === 1 ? '1 task added' : `${created} tasks added`;
    return successResponse(await getMeeting(ctx.scope, id), message);
  } catch (error) {
    console.error('Error creating tasks from meeting:', error);
    return ApiErrors.ServerError('Failed to add the tasks');
  }
}
