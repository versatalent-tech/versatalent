import { NextRequest, NextResponse } from 'next/server';
import { getAllCheckIns, createCheckIn, getCheckInsByUserId, getCheckInsByEventId } from '@/lib/db/repositories/checkins';
import { getUserById } from '@/lib/db/repositories/users';
import { processEventCheckin } from '@/lib/services/vip-points-service';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('user_id');
    const eventId = searchParams.get('event_id');

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

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();

    // Get IP and user agent from request
    const ip = request.headers.get('x-forwarded-for') ||
                request.headers.get('x-real-ip') ||
                'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    // Add to request data
    data.ip_address = ip;
    data.user_agent = userAgent;

    // Validate required fields
    if (!data.user_id || !data.source) {
      return NextResponse.json(
        { error: 'Missing required fields: user_id, source' },
        { status: 400 }
      );
    }

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
