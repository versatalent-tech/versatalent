import { NextRequest } from 'next/server';
import { z } from 'zod';
import { requireTeamPermission } from '@/lib/middleware/auth';
import { parseBody } from '@/lib/crm/route-helpers';
import { deleteTicketMessage, listTicketMessageLog, logTicketMessages } from '@/lib/db/repositories/customer-messages';
import { MESSAGE_CHANNELS, QUEUE_KEYS, type MessageChannel } from '@/lib/messages/types';
import { ApiErrors, successResponse } from '@/lib/utils/api-response';
import { isValidUUID } from '@/lib/utils/validation';

export const dynamic = 'force-dynamic';

// GET /api/admin/messages/log - messages recently marked sent
export async function GET() {
  const auth = await requireTeamPermission('venue.manage');
  if ('response' in auth) return auth.response;
  try {
    return successResponse(await listTicketMessageLog());
  } catch (error) {
    console.error('Error loading message log:', error);
    return ApiErrors.ServerError('Failed to load');
  }
}

const schema = z.object({
  queue: z.enum(QUEUE_KEYS),
  channel: z.enum(Object.keys(MESSAGE_CHANNELS) as [MessageChannel, ...MessageChannel[]]),
  template_id: z.string().uuid().nullable().optional(),
  order_ids: z.array(z.string().uuid()).min(1).max(500),
});

// POST /api/admin/messages/log - mark ticket orders as messaged (or skipped) for a queue
export async function POST(request: NextRequest) {
  const auth = await requireTeamPermission('venue.manage');
  if ('response' in auth) return auth.response;
  const body = await parseBody(request, schema);
  if ('response' in body) return body.response;
  try {
    const { order_ids, queue, channel, template_id } = body.data;
    const recorded = await logTicketMessages(order_ids, queue, channel, template_id ?? null, auth.session.userId ?? null);
    return successResponse({ recorded }, `${recorded} marked`);
  } catch (error) {
    console.error('Error recording ticket messages:', error);
    return ApiErrors.ServerError('Failed to save');
  }
}

// DELETE /api/admin/messages/log?id=<id> - undo a mark; the order goes back on its list
export async function DELETE(request: NextRequest) {
  const auth = await requireTeamPermission('venue.manage');
  if ('response' in auth) return auth.response;
  const id = request.nextUrl.searchParams.get('id');
  if (!id || !isValidUUID(id)) return ApiErrors.NotFound('Message');
  try {
    if (!(await deleteTicketMessage(id))) return ApiErrors.NotFound('Message');
    return successResponse({ id }, 'Undone');
  } catch (error) {
    console.error('Error undoing ticket message:', error);
    return ApiErrors.ServerError('Failed to undo');
  }
}
