import { NextRequest, NextResponse } from 'next/server';
import { findMemberByCard } from '@/lib/db/repositories/tickets';
import { getClientIp, isLoginThrottled, recordLoginAttempt } from '@/lib/auth/login-throttle';
import { ApiErrors, successResponse } from '@/lib/utils/api-response';

export const dynamic = 'force-dynamic';

const notAMemberCard = () => NextResponse.json({ success: false, error: 'This card isn’t a membership card' }, { status: 404 });

/**
 * POST /api/tickets/card { card_uid } - a membership card tapped on the ticket
 * form (Android): the member's id, first name and tier, as the card's own pass
 * shows. Unknown cards count towards the per-connection limit.
 */
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const cardUid = typeof body.card_uid === 'string' ? body.card_uid.trim().toUpperCase() : '';
  if (!/^[0-9A-F]{8,20}$/.test(cardUid)) return notAMemberCard();

  const ip = getClientIp(request);
  if (await isLoginThrottled('ticket-card', ip)) return ApiErrors.BadRequest('Too many cards tried. Please try again in 15 minutes.');

  try {
    const member = await findMemberByCard(cardUid);
    if (!member) {
      await recordLoginAttempt('ticket-card', ip, false);
      return notAMemberCard();
    }
    return successResponse(member);
  } catch (error) {
    console.error('Error looking up a ticket card:', error);
    return ApiErrors.ServerError('Couldn’t read the card');
  }
}
