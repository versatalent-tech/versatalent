import { NextRequest } from 'next/server';
import { doorContext } from '@/lib/tickets/door-context';
import { undoTicket } from '@/lib/db/repositories/door-tickets';
import { ApiErrors, successResponse } from '@/lib/utils/api-response';
import { isValidUUID } from '@/lib/utils/validation';

// POST /api/staff/event-day/[eventId]/tickets/[ticketId]/undo - undo an admission (e.g. the wrong person scanned)
export async function POST(_request: NextRequest, { params }: { params: Promise<{ eventId: string; ticketId: string }> }) {
  const { eventId, ticketId } = await params;
  const ctx = await doorContext(eventId);
  if ('response' in ctx) return ctx.response;
  if (!isValidUUID(ticketId)) return ApiErrors.NotFound('Ticket');
  try {
    if (!(await undoTicket(ticketId, eventId))) return ApiErrors.NotFound('Admitted ticket');
    return successResponse(null, 'Undone');
  } catch (error) {
    console.error('Error undoing ticket:', error);
    return ApiErrors.ServerError('Failed to undo');
  }
}
