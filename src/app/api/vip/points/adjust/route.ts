import { NextRequest, NextResponse } from 'next/server';
import { adjustPointsManually } from '@/lib/services/vip-points-service';
import type { ManualPointsAdjustmentRequest } from '@/lib/db/types';
import { getCurrentSession, requireAdmin } from '@/lib/middleware/auth';
import { logAudit } from '@/lib/db/repositories/audit-log';

/**
 * POST manual points adjustment (admin only)
 * { user_id, delta_points, reason, ledger?: 'reward' | 'status' } - reward
 * points (to spend) by default. Never takes a balance below zero.
 */
export async function POST(request: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const session = await getCurrentSession();

  try {
    const data: ManualPointsAdjustmentRequest & { ledger?: string } = await request.json();
    const ledger = data.ledger === 'status' ? 'status' : 'reward';
    const delta = Math.trunc(Number(data.delta_points));

    if (!data.user_id || !Number.isFinite(delta) || delta === 0 || !data.reason?.trim()) {
      return NextResponse.json(
        { error: 'Missing required fields: user_id, delta_points (not zero), reason' },
        { status: 400 }
      );
    }

    const result = await adjustPointsManually(data.user_id, delta, data.reason.trim(), session?.userId, ledger);
    await logAudit({ userId: session?.userId, name: session?.name }, 'adjust_points', 'vip_membership', data.user_id, {
      after: { ledger, requested: delta, applied: result.applied, balance: result.newBalance, reason: data.reason.trim() },
    });

    return NextResponse.json({
      success: result.success,
      ledger,
      delta_points: result.applied,
      new_balance: result.newBalance,
      new_tier: result.newTier,
      message:
        result.applied === delta
          ? `${delta > 0 ? 'Added' : 'Deducted'} ${Math.abs(delta)} ${ledger} points`
          : `Deducted ${Math.abs(result.applied)} ${ledger} points (the balance can't go below zero)`,
    });
  } catch (error: any) {
    console.error('Error adjusting points:', error);
    return NextResponse.json(
      { error: 'Failed to adjust points', details: error.message },
      { status: 500 }
    );
  }
}
