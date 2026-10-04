import { NextRequest, NextResponse } from 'next/server';
import { getAllCheckIns, createCheckIn, getCheckInsByUserId, getCheckInsByEventId } from '@/lib/db/repositories/checkins';
import { getUserById } from '@/lib/db/repositories/users';
import { processEventCheckin } from '@/lib/services/vip-points-service';
import { requireAdmin, getCurrentSession } from '@/lib/middleware/auth';
import { getNFCCardByUID } from '@/lib/db/repositories/nfc-cards';
import type { CheckInSource, CreateCheckInRequest } from '@/lib/db/types';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('user_id');
    const eventId = searchParams.get('event_id');

    // Per-user history backs the public VIP pass page; everything else is admin only
    if (!userId) {
      const denied = await requireAdmin();
      if (denied) return denied;
    }

    let checkins;
    if (userId) {
      checkins = await getCheckInsByUserId(userId);
    } else if (eventId) {
      checkins = await getCheckInsByEventId(eventId);
    } else {
      checkins = await getAllCheckIns();
    }

    return NextResponse.json(checkins);
  } catch (error) {
    console.error('Error fetching check-ins:', error);
    return NextResponse.json(
      { error: 'Failed to fetch check-ins' },
      { status: 500 }
    );
  }
}

const CHECKIN_SOURCES: CheckInSource[] = ['artist_profile', 'vip_pass', 'event_checkin', 'admin'];

/**
 * Record a check-in and award points to VIP/artist members.
 *
 * Public callers (a phone tapping a card opens /nfc/[card_uid]) must send the
 * card_uid: the member, card and source are taken from the card, so a member
 * ID alone can't be used to check someone in or earn their points. Public
 * check-ins never carry an event, so they earn the once-a-day points.
 *
 * Logged-in staff and admins may check in any member directly with
 * { user_id, source, nfc_card_id?, event_id?, metadata? }.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const ip = request.headers.get('x-forwarded-for') ||
                request.headers.get('x-real-ip') ||
                'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    let data: CreateCheckInRequest;
    const session = await getCurrentSession();

    if (session) {
      if (!body.user_id || !body.source) {
        return NextResponse.json(
          { error: 'Missing required fields: user_id, source' },
          { status: 400 }
        );
      }
      if (!CHECKIN_SOURCES.includes(body.source)) {
        return NextResponse.json({ error: 'Invalid source' }, { status: 400 });
      }
      data = {
        user_id: body.user_id,
        nfc_card_id: body.nfc_card_id,
        event_id: body.event_id,
        source: body.source,
        metadata: { ...(body.metadata || {}), staff_user_id: session.userId },
      };
    } else {
      const cardUid = typeof body.card_uid === 'string' ? body.card_uid.trim() : '';
      if (!cardUid) {
        return NextResponse.json(
          { error: 'card_uid is required' },
          { status: 400 }
        );
      }

      const card = await getNFCCardByUID(cardUid);
      if (!card || !card.user?.id) {
        return NextResponse.json({ error: 'NFC card not found' }, { status: 404 });
      }
      if (!card.is_active || card.status === 'blocked') {
        return NextResponse.json(
          { error: 'This NFC card has been deactivated' },
          { status: 403 }
        );
      }

      data = {
        user_id: card.user.id,
        nfc_card_id: card.id,
        source: card.type === 'artist' ? 'artist_profile' : 'vip_pass',
        metadata: { card_uid: card.card_uid, via: 'card_tap' },
      };
    }

    data.ip_address = ip;
    data.user_agent = userAgent;

    const checkin = await createCheckIn(data);

    // Award points for VIP members
    try {
      const user = await getUserById(data.user_id);

      if (user && (user.role === 'vip' || user.role === 'artist')) {
        const pointsResult = await processEventCheckin(
          data.user_id,
          data.event_id,
          checkin.id
        );

        return NextResponse.json({
          checkin,
          points: {
            awarded: pointsResult.pointsAwarded,
            already_awarded: pointsResult.alreadyAwarded,
            new_balance: pointsResult.newBalance,
            new_tier: pointsResult.newTier
          }
        }, { status: 201 });
      }
    } catch (pointsError) {
      console.error('Error awarding points for check-in:', pointsError);
      // Continue even if points award fails
    }

    return NextResponse.json(checkin, { status: 201 });
  } catch (error) {
    console.error('Error creating check-in:', error);
    return NextResponse.json(
      { error: 'Failed to create check-in' },
      { status: 500 }
    );
  }
}
