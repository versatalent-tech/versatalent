import { requireTeamPermission } from '@/lib/middleware/auth';
import { listTicketEvents } from '@/lib/db/repositories/tickets';
import { ApiErrors, successResponse } from '@/lib/utils/api-response';

export const dynamic = 'force-dynamic';

/** GET /api/admin/tickets/events - events to sell tickets for (admin) */
export async function GET() {
  const auth = await requireTeamPermission('venue.manage');
  if ('response' in auth) return auth.response;
  try {
    return successResponse(await listTicketEvents());
  } catch (error) {
    console.error('Ticket events error:', error);
    return ApiErrors.ServerError('Couldn’t load events');
  }
}
