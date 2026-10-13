import { NextRequest } from 'next/server';
import { requireTalent } from '@/lib/auth/talent-auth';
import { listPublicEvents } from '@/lib/db/repositories/bookings';
import { ApiErrors, successResponse } from '@/lib/utils/api-response';

export const dynamic = 'force-dynamic';

const DAY = 24 * 60 * 60 * 1000;

// GET /api/portal/events?when=upcoming|past - published events the talent appears at
export async function GET(request: NextRequest) {
  const auth = await requireTalent();
  if ('response' in auth) return auth.response;
  const past = request.nextUrl.searchParams.get('when') === 'past';
  const now = Date.now();
  const range = past
    ? { from: new Date(now - 365 * DAY).toISOString(), to: new Date(now).toISOString() }
    : { from: new Date(now).toISOString(), to: new Date(now + 2 * 365 * DAY).toISOString() };

  try {
    const { talentId } = auth.talent;
    const events = await listPublicEvents({ all: false, talentIds: [talentId] }, range.from, range.to, {
      talentId,
      publishedOnly: true,
    });
    return successResponse(past ? events.reverse() : events);
  } catch (error) {
    console.error('Portal events error:', error);
    return ApiErrors.ServerError('Failed to load your events');
  }
}
