import { NextRequest } from 'next/server';
import { requireTeamPermission } from '@/lib/middleware/auth';
import { parseBody } from '@/lib/crm/route-helpers';
import { createTicketType, eventExists, listTicketTypes, type TicketTypeInput } from '@/lib/db/repositories/tickets';
import { ticketTypeSchema } from '@/lib/tickets/schemas';
import { logAudit } from '@/lib/db/repositories/audit-log';
import { ApiErrors, successResponse } from '@/lib/utils/api-response';
import { isValidUUID } from '@/lib/utils/validation';

export const dynamic = 'force-dynamic';

/** GET /api/admin/tickets/types?event=<id> - an event's ticket types with sales (admin) */
export async function GET(request: NextRequest) {
  const auth = await requireTeamPermission('venue.manage');
  if ('response' in auth) return auth.response;
  const eventId = request.nextUrl.searchParams.get('event') ?? '';
  if (!isValidUUID(eventId)) return ApiErrors.BadRequest('Choose an event');
  return successResponse(await listTicketTypes(eventId));
}

/** POST /api/admin/tickets/types - add a ticket type (admin) */
export async function POST(request: NextRequest) {
  const auth = await requireTeamPermission('venue.manage');
  if ('response' in auth) return auth.response;
  const body = await parseBody(request, ticketTypeSchema);
  if ('response' in body) return body.response;
  const input = body.data as TicketTypeInput;
  if (!(await eventExists(input.event_id))) return ApiErrors.NotFound('Event');

  const id = await createTicketType(input);
  await logAudit({ userId: auth.session.userId, name: auth.session.name }, 'create', 'ticket_type', id, { after: input });
  return successResponse({ id }, 'Ticket type added', 201);
}
