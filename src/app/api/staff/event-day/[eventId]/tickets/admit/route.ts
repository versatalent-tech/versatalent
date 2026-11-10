import { NextRequest } from 'next/server';
import { doorContext } from '@/lib/tickets/door-context';
import { admitByCode } from '@/lib/db/repositories/door-tickets';
import { normaliseTicketCode } from '@/lib/tickets/codes';
import { ApiErrors, successResponse } from '@/lib/utils/api-response';

// POST /api/staff/event-day/[eventId]/tickets/admit { code } - a QR scanned at the door
export async function POST(request: NextRequest, { params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;
  const ctx = await doorContext(eventId);
  if ('response' in ctx) return ctx.response;
  const body = await request.json().catch(() => ({}));
  const code = typeof body.code === 'string' ? normaliseTicketCode(body.code) : null;
  if (!code) return successResponse({ status: 'unknown' });
  try {
    return successResponse(await admitByCode(eventId, code, ctx.actor));
  } catch (error) {
    console.error('Error admitting ticket:', error);
    return ApiErrors.ServerError('Failed to check the ticket');
  }
}
