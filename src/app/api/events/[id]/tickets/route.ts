import { NextRequest } from 'next/server';
import { getPublicTicketEvent } from '@/lib/db/repositories/tickets';
import { ApiErrors, successResponse } from '@/lib/utils/api-response';

export const dynamic = 'force-dynamic';

/** GET /api/events/[id]/tickets - the event's ticket types, prices and what's left (public) */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const event = await getPublicTicketEvent(id);
    return event ? successResponse(event) : ApiErrors.NotFound('Event');
  } catch (error) {
    console.error('Ticket types error:', error);
    return ApiErrors.ServerError('Couldn’t load the tickets');
  }
}
