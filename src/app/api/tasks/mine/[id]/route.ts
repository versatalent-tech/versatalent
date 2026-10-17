import { NextRequest } from 'next/server';
import { z } from 'zod';
import { requireTeamPermission } from '@/lib/middleware/auth';
import { parseBody } from '@/lib/crm/route-helpers';
import { setMyTaskDone } from '@/lib/db/repositories/my-tasks';
import { ApiErrors, successResponse } from '@/lib/utils/api-response';
import { isValidUUID } from '@/lib/utils/validation';

const schema = z.object({ completed: z.boolean() });

/** PATCH /api/tasks/mine/[id] { completed } - tick off or reopen one of your own tasks */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireTeamPermission('dashboard.view');
  if ('response' in auth) return auth.response;
  const { id } = await params;
  if (!isValidUUID(id) || !auth.session.userId) return ApiErrors.NotFound('Task');
  const body = await parseBody(request, schema);
  if ('response' in body) return body.response;
  try {
    if (!(await setMyTaskDone(auth.session.userId, id, body.data.completed as boolean))) return ApiErrors.NotFound('Task');
    return successResponse({ id, completed: body.data.completed });
  } catch (error) {
    console.error('Error updating my task:', error);
    return ApiErrors.ServerError('Failed to save');
  }
}
