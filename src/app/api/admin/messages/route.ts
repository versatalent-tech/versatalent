import { NextRequest } from 'next/server';
import { requireTeamPermission } from '@/lib/middleware/auth';
import { countQueues, listQueue } from '@/lib/db/repositories/customer-messages';
import { QUEUE_KEYS, type Queue } from '@/lib/messages/types';
import { ApiErrors, successResponse } from '@/lib/utils/api-response';
import { isValidUUID } from '@/lib/utils/validation';

export const dynamic = 'force-dynamic';

// GET /api/admin/messages?queue=confirmation&event=<id> - ticket buyers to message, and how many wait in each queue
export async function GET(request: NextRequest) {
  const auth = await requireTeamPermission('venue.manage');
  if ('response' in auth) return auth.response;
  const params = request.nextUrl.searchParams;
  const requested = params.get('queue') as Queue;
  const queue = QUEUE_KEYS.includes(requested) ? requested : 'confirmation';
  const event = params.get('event');
  const eventId = event && isValidUUID(event) ? event : null;
  try {
    const [counts, candidates] = await Promise.all([countQueues(), listQueue(queue, request.nextUrl.origin, eventId)]);
    return successResponse({ queue, counts, candidates });
  } catch (error) {
    console.error('Error loading customer messages:', error);
    return ApiErrors.ServerError('Failed to load. Has migration 046 been run?');
  }
}
