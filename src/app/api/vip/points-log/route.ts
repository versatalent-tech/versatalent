import { NextRequest, NextResponse } from 'next/server';
import { getAllPointsLogs, getPointsLogsByUserId } from '@/lib/db/repositories/vip-points-log';
import { requireAdmin } from '@/lib/middleware/auth';
import { canReadMemberHistory } from '@/lib/auth/member-access';

// GET points log (all or by user_id)
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('user_id');
    const limit = searchParams.get('limit');

    let logs;
    if (userId) {
      if (!(await canReadMemberHistory(userId))) {
        return NextResponse.json({ error: 'Points history is only shown to the team for now' }, { status: 403 });
      }
      logs = await getPointsLogsByUserId(userId, limit ? parseInt(limit) : 100);
    } else {
      // Listing every member's points log is admin only
      const denied = await requireAdmin();
      if (denied) return denied;

      logs = await getAllPointsLogs();
    }

    return NextResponse.json(logs);
  } catch (error) {
    console.error('Error fetching points log:', error);
    return NextResponse.json(
      { error: 'Failed to fetch points log' },
      { status: 500 }
    );
  }
}
