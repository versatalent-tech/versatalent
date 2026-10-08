import { NextRequest } from 'next/server';
import { requireTeamPermission } from '@/lib/middleware/auth';
import { hasCalendarFeed, issueCalendarFeed, revokeCalendarFeed } from '@/lib/db/repositories/bookings';
import { ApiErrors, successResponse } from '@/lib/utils/api-response';

export const dynamic = 'force-dynamic';

const NEEDS_ACCOUNT = 'Calendar links need a personal account. Sign in with your own email, not the shared admin login.';

// GET /api/calendar/feed - does this person have a subscription link?
export async function GET() {
  const auth = await requireTeamPermission('bookings.view');
  if ('response' in auth) return auth.response;
  if (!auth.session.userId) return successResponse({ active: false, available: false });
  return successResponse({ active: await hasCalendarFeed(auth.session.userId), available: true });
}

// POST /api/calendar/feed - create (or replace) the link; it's only shown now
export async function POST(request: NextRequest) {
  const auth = await requireTeamPermission('bookings.view');
  if ('response' in auth) return auth.response;
  if (!auth.session.userId) return ApiErrors.BadRequest(NEEDS_ACCOUNT);

  const token = await issueCalendarFeed(auth.session.userId);
  const url = `${request.nextUrl.origin}/api/calendar/ics/${token}.ics`;
  return successResponse({ url, webcal: url.replace(/^https?:/, 'webcal:') });
}

// DELETE /api/calendar/feed - stop the link working
export async function DELETE() {
  const auth = await requireTeamPermission('bookings.view');
  if ('response' in auth) return auth.response;
  if (!auth.session.userId) return ApiErrors.BadRequest(NEEDS_ACCOUNT);
  await revokeCalendarFeed(auth.session.userId);
  return successResponse(null, 'Calendar link turned off');
}
