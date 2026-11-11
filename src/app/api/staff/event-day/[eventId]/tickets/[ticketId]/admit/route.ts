import { NextRequest } from 'next/server';
import { doorContext } from '@/lib/tickets/door-context';
import { admitTicket } from '@/lib/db/repositories/door-tickets';
import { ApiErrors, successResponse } from '@/lib/utils/api-response';
import { isValidUUID } from '@/lib/utils/validation';

// POST /api/staff/event-day/[eventId]/tickets/[ticketId]/admit - let a ticket in by hand
export async function POST(_request: NextRequest, { params }: { params: Promise<{ eventId: string; ticketId: string }> }) {
  const { eventId, ticketId } = await params;
  const ctx = await doorContext(eventId);
  if ('response' in ctx) return ctx.response;
  if (!isValidUUID(ticketId)) return successResponse({ status: 'unknown' });
  try {
    return successResponse(await admitTicket(ticketId, eventId, ctx.actor, 'manual'));
  } catch (error) {
    console.error('Error admitting ticket by hand:', error);
    return ApiErrors.ServerError('Failed to let the ticket in');
  }
}
