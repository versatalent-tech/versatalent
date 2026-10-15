import { NextRequest } from 'next/server';
import { requireTeamPermission } from '@/lib/middleware/auth';
import { parseBody } from '@/lib/crm/route-helpers';
import { deleteTicketType, updateTicketType, type TicketTypeInput } from '@/lib/db/repositories/tickets';
import { ticketTypeSchema } from '@/lib/tickets/schemas';
import { logAudit } from '@/lib/db/repositories/audit-log';
import { ApiErrors, successResponse } from '@/lib/utils/api-response';
import { isValidUUID } from '@/lib/utils/validation';

type Context = { params: Promise<{ id: string }> };

/** PUT /api/admin/tickets/types/[id] - change a ticket type; orders keep what they paid (admin) */
export async function PUT(request: NextRequest, { params }: Context) {
  const auth = await requireTeamPermission('venue.manage');
  if ('response' in auth) return auth.response;
  const { id } = await params;
  if (!isValidUUID(id)) return ApiErrors.NotFound('Ticket type');
  const body = await parseBody(request, ticketTypeSchema);
  if ('response' in body) return body.response;

  if (!(await updateTicketType(id, body.data as TicketTypeInput))) return ApiErrors.NotFound('Ticket type');
  await logAudit({ userId: auth.session.userId, name: auth.session.name }, 'update', 'ticket_type', id, { after: body.data });
  return successResponse({ id }, 'Ticket type saved');
}

/** DELETE /api/admin/tickets/types/[id] - delete, or switch off if anyone has ordered it (admin) */
export async function DELETE(_request: NextRequest, { params }: Context) {
  const auth = await requireTeamPermission('venue.manage');
  if ('response' in auth) return auth.response;
  const { id } = await params;
  if (!isValidUUID(id)) return ApiErrors.NotFound('Ticket type');

  const result = await deleteTicketType(id);
  if (result === 'not_found') return ApiErrors.NotFound('Ticket type');
  await logAudit({ userId: auth.session.userId, name: auth.session.name }, result === 'deleted' ? 'delete' : 'deactivate', 'ticket_type', id);
  return successResponse(
    { result },
    result === 'deleted' ? 'Ticket type deleted' : 'People have bought this ticket, so it was taken off sale instead of deleted'
  );
}
