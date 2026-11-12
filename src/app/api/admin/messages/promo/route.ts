import { NextRequest } from 'next/server';
import { requireTeamPermission } from '@/lib/middleware/auth';
import { listPromoEvents, pastBuyerEmails } from '@/lib/db/repositories/customer-messages';
import { ApiErrors, successResponse } from '@/lib/utils/api-response';
import { isValidUUID } from '@/lib/utils/validation';

export const dynamic = 'force-dynamic';

// GET /api/admin/messages/promo?event=<id> - upcoming events to promote; with an event, past buyers to invite
export async function GET(request: NextRequest) {
  const auth = await requireTeamPermission('venue.manage');
  if ('response' in auth) return auth.response;
  const event = request.nextUrl.searchParams.get('event');
  try {
    const events = await listPromoEvents(request.nextUrl.origin);
    const emails = event && isValidUUID(event) ? await pastBuyerEmails(event) : [];
    return successResponse({ events, past_buyer_emails: emails });
  } catch (error) {
    console.error('Error loading promotion data:', error);
    return ApiErrors.ServerError('Failed to load');
  }
}
