import { NextRequest } from 'next/server';
import { requireTalent } from '@/lib/auth/talent-auth';
import { hasCalendarFeed, issueCalendarFeed, revokeCalendarFeed } from '@/lib/db/repositories/bookings';
import { successResponse } from '@/lib/utils/api-response';

export const dynamic = 'force-dynamic';

// GET /api/portal/calendar-feed - does the talent have a calendar link?
export async function GET() {
  const auth = await requireTalent();
  if ('response' in auth) return auth.response;
  return successResponse({ active: await hasCalendarFeed(auth.talent.userId), available: true });
}

// POST /api/portal/calendar-feed - create (or replace) the talent's private calendar link
export async function POST(request: NextRequest) {
  const auth = await requireTalent();
  if ('response' in auth) return auth.response;
  const token = await issueCalendarFeed(auth.talent.userId);
  const url = `${request.nextUrl.origin}/api/calendar/ics/${token}.ics`;
  return successResponse({ url, webcal: url.replace(/^https?:/, 'webcal:') });
}

// DELETE /api/portal/calendar-feed
export async function DELETE() {
  const auth = await requireTalent();
  if ('response' in auth) return auth.response;
  await revokeCalendarFeed(auth.talent.userId);
  return successResponse(null, 'Calendar link turned off');
}
