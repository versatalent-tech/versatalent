import { NextRequest } from 'next/server';
import { doorContext } from '@/lib/tickets/door-context';
import { searchDoorOrders } from '@/lib/db/repositories/door-tickets';
import { ApiErrors, successResponse } from '@/lib/utils/api-response';

export const dynamic = 'force-dynamic';

// GET /api/staff/event-day/[eventId]/tickets?q= - find paid orders by name, email or reference
export async function GET(request: NextRequest, { params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;
  const ctx = await doorContext(eventId);
  if ('response' in ctx) return ctx.response;
  try {
    return successResponse(await searchDoorOrders(eventId, request.nextUrl.searchParams.get('q') ?? ''));
  } catch (error) {
    console.error('Error searching door tickets:', error);
    return ApiErrors.ServerError('Failed to search tickets');
  }
}
