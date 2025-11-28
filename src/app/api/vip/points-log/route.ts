import { NextRequest, NextResponse } from 'next/server';
import { getAllPointsLogs, getPointsLogsByUserId } from '@/lib/db/repositories/vip-points-log';

// GET points log (all or by user_id)
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('user_id');
    const limit = searchParams.get('limit');

    let logs;
    if (userId) {
      logs = await getPointsLogsByUserId(userId, limit ? parseInt(limit) : 100);
    } else {
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
