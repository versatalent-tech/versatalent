import { NextRequest, NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/middleware/auth';
import { getNFCCardByUID } from '@/lib/db/repositories/nfc-cards';
import { createCheckIn } from '@/lib/db/repositories/checkins';
import { createScanLog } from '@/lib/db/repositories/nfc-scan-logs';
import { getEventDayEvent, findEventCheckin } from '@/lib/db/repositories/event-day';
import { processEventCheckin } from '@/lib/services/vip-points-service';

// Roles that earn loyalty points for checking in (same as /api/nfc/checkins)
const POINTS_ROLES = ['vip', 'artist'];

/**
 * Check a customer in at the door by their NFC card and award their points
 * POST /api/staff/event-day/:eventId/checkin  { card_uid }
 *
 * A member is checked in once per event; tapping again returns their
 * existing check-in. Points are awarded by processEventCheckin, which
 * guarantees at most one award per member per event (per day if the event
 * isn't today).
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: 'Staff authentication required' }, { status: 401 });
  }

  const { eventId } = await params;
  const body = await request.json().catch(() => ({}));
  const cardUid = typeof body.card_uid === 'string' ? body.card_uid.trim().toUpperCase() : '';

  if (!cardUid) {
    return NextResponse.json({ error: 'card_uid is required' }, { status: 400 });
  }

  const logScan = (success: boolean, extra: { nfc_card_id?: string; user_id?: string; error_message?: string } = {}) =>
    createScanLog({
      card_uid: cardUid,
      scan_type: success ? 'read' : 'error',
      reader_device: 'event-day',
      success,
      metadata: { event_id: eventId, staff_user_id: session.userId },
      ...extra,
    }).catch(err => console.error('Failed to log event-day scan:', err));

  try {
    const event = await getEventDayEvent(eventId);
    if (!event || !event.checkins_enabled) {
      return NextResponse.json(
        { error: 'Check-ins are not enabled for this event' },
        { status: 409 }
      );
    }

    const card = await getNFCCardByUID(cardUid);
    if (!card || !card.user?.id) {
      await logScan(false, { error_message: 'Card not registered' });
      return NextResponse.json(
        { error: 'This card is not registered', code: 'CARD_NOT_FOUND' },
        { status: 404 }
      );
    }

    if (!card.is_active || card.status === 'blocked') {
      await logScan(false, { nfc_card_id: card.id, user_id: card.user.id, error_message: 'Card inactive' });
      return NextResponse.json(
        { error: 'This card has been deactivated — please see a member of staff', code: 'CARD_INACTIVE' },
        { status: 403 }
      );
    }

    const user = card.user;
    const customer = { id: user.id, name: user.name, role: user.role, avatar_url: user.avatar_url ?? null };
    const earnsPoints = POINTS_ROLES.includes(user.role);

    // Award points (idempotent per member per event, so a repeat tap also
    // retries an award that failed the first time)
    const awardPoints = async (checkinId: string) => {
      if (!earnsPoints) return { points: null, pointsError: false };
      try {
        const result = await processEventCheckin(user.id, event.nfc_event_id, checkinId);
        return {
          points: {
            awarded: result.pointsAwarded,
            already_awarded: result.alreadyAwarded,
            balance: result.newBalance,
            tier: result.newTier,
          },
          pointsError: false,
        };
      } catch (err) {
        // The check-in stands; the award was released so a later tap can retry it
        console.error('Error awarding event-day check-in points:', err);
        return { points: null, pointsError: true };
      }
    };

    const existing = await findEventCheckin(event.nfc_event_id, user.id);
    if (existing) {
      await logScan(true, { nfc_card_id: card.id, user_id: user.id });
      const { points, pointsError } = await awardPoints(existing.id);
      return NextResponse.json({
        status: 'already_checked_in',
        customer,
        checked_in_at: existing.timestamp,
        points,
        points_error: pointsError,
      });
    }

    const checkin = await createCheckIn({
      user_id: user.id,
      nfc_card_id: card.id,
      event_id: event.nfc_event_id,
      source: 'event_checkin',
      metadata: { via: 'event_day', public_event_id: event.id, staff_user_id: session.userId },
      ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
      user_agent: request.headers.get('user-agent') || undefined,
    });
    await logScan(true, { nfc_card_id: card.id, user_id: user.id });

    const { points, pointsError } = await awardPoints(checkin.id);

    return NextResponse.json({
      status: 'checked_in',
      customer,
      checked_in_at: checkin.timestamp,
      points,
      points_error: pointsError,
    }, { status: 201 });
  } catch (error) {
    console.error('Error processing event-day check-in:', error);
    return NextResponse.json({ error: 'Check-in failed — please try again' }, { status: 500 });
  }
}
