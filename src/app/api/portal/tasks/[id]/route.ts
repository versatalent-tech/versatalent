import { NextRequest } from 'next/server';
import { z } from 'zod';
import { requireTalent } from '@/lib/auth/talent-auth';
import { setMyTaskDone } from '@/lib/db/repositories/my-tasks';
import { ApiErrors, successResponse } from '@/lib/utils/api-response';
import { isValidUUID } from '@/lib/utils/validation';

const schema = z.object({ completed: z.boolean() });

/** PATCH /api/portal/tasks/[id] { completed } - the talent ticks off (or reopens) one of their to-dos */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireTalent();
  if ('response' in auth) return auth.response;
  const { id } = await params;
  if (!isValidUUID(id)) return ApiErrors.NotFound('To-do');
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return ApiErrors.BadRequest('Invalid request');
  try {
    if (!(await setMyTaskDone(auth.talent.userId, id, parsed.data.completed as boolean))) return ApiErrors.NotFound('To-do');
    return successResponse({ id, completed: parsed.data.completed });
  } catch (error) {
    console.error('Error updating portal task:', error);
    return ApiErrors.ServerError('Failed to save');
  }
}
