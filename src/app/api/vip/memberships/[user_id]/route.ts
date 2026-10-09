import { NextRequest, NextResponse } from 'next/server';
import { updateVIPMembership } from '@/lib/db/repositories/vip-memberships';
import { adjustPointsManually, getCurrentMembership } from '@/lib/services/vip-points-service';
import { getTierProgress, getTierSettings } from '@/lib/services/vip-tiers';
import { updateUserNFCCardsMetadata } from '@/lib/db/repositories/nfc-cards';
import type { UpdateVIPMembershipRequest } from '@/lib/db/types';
import { getCurrentSession, requireAdmin } from '@/lib/middleware/auth';
import { logAudit } from '@/lib/db/repositories/audit-log';

// GET VIP membership by user_id
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ user_id: string }> }
) {
  try {
    const { user_id } = await params;
    const membership = await getCurrentMembership(user_id);

    if (!membership) {
      return NextResponse.json(
        { error: 'VIP membership not found' },
        { status: 404 }
      );
    }

    // What the member needs to keep or reach a tier, for the VIP page
    const progress = getTierProgress(membership, await getTierSettings());
    return NextResponse.json({ ...membership, progress });
  } catch (error) {
    console.error('Error fetching VIP membership:', error);
    return NextResponse.json(
      { error: 'Failed to fetch VIP membership' },
      { status: 500 }
    );
  }
}

// PUT update VIP membership
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ user_id: string }> }
) {
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    const { user_id } = await params;
    const { points_balance, ...data }: UpdateVIPMembershipRequest = await request.json();
    const session = await getCurrentSession();

    // A new balance is recorded as an adjustment, so the ledger still adds up
    if (points_balance !== undefined) {
      const current = await getCurrentMembership(user_id);
      const delta = Math.trunc(Number(points_balance)) - (current?.points_balance ?? 0);
      if (!Number.isFinite(delta) || Number(points_balance) < 0) {
        return NextResponse.json({ error: 'Enter a balance of zero or more' }, { status: 400 });
      }
      if (delta !== 0) {
        await adjustPointsManually(user_id, delta, 'Balance set by admin', session?.userId, 'reward');
      }
    }

    const membership =
      data.tier !== undefined || data.status !== undefined
        ? await updateVIPMembership(user_id, data)
        : await getCurrentMembership(user_id);
    await logAudit({ userId: session?.userId, name: session?.name }, 'update', 'vip_membership', user_id, {
      after: { ...data, ...(points_balance !== undefined ? { points_balance } : {}) },
    });

    // If tier was updated, update all NFC cards metadata for this user
    if (data.tier) {
      try {
        await updateUserNFCCardsMetadata(user_id);
      } catch (metadataError) {
        console.error('Error updating NFC cards metadata:', metadataError);
        // Don't fail the request if metadata update fails
      }
    }

    return NextResponse.json(membership);
  } catch (error: any) {
    console.error('Error updating VIP membership:', error);

    if (error.message === 'No fields to update') {
      return NextResponse.json(
        { error: 'No fields to update' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to update VIP membership', details: error.message },
      { status: 500 }
    );
  }
}
