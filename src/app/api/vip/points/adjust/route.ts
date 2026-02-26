import { NextRequest, NextResponse } from 'next/server';
import { adjustPointsManually } from '@/lib/services/vip-points-service';
import type { ManualPointsAdjustmentRequest } from '@/lib/db/types';

// POST manual points adjustment (admin only)
export async function POST(request: NextRequest) {
  try {
    const data: ManualPointsAdjustmentRequest = await request.json();

    // Validate required fields
    if (!data.user_id || data.delta_points === undefined || !data.reason) {
      return NextResponse.json(
        { error: 'Missing required fields: user_id, delta_points, reason' },
        { status: 400 }
      );
    }

    // Process manual adjustment
    const result = await adjustPointsManually(
      data.user_id,
      data.delta_points,
      data.reason
    );

    return NextResponse.json({
      success: result.success,
      delta_points: data.delta_points,
      new_balance: result.newBalance,
      new_tier: result.newTier,
      message: `Successfully ${data.delta_points > 0 ? 'added' : 'deducted'} ${Math.abs(data.delta_points)} points`
    });
  } catch (error: any) {
    console.error('Error adjusting points:', error);
    return NextResponse.json(
      { error: 'Failed to adjust points', details: error.message },
      { status: 500 }
    );
  }
}
