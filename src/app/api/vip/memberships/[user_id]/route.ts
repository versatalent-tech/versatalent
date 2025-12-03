import { NextRequest, NextResponse } from 'next/server';
import { getVIPMembershipByUserId, updateVIPMembership } from '@/lib/db/repositories/vip-memberships';
import type { UpdateVIPMembershipRequest } from '@/lib/db/types';

// GET VIP membership by user_id
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ user_id: string }> }
) {
  try {
    const { user_id } = await params;
    const membership = await getVIPMembershipByUserId(user_id);

    if (!membership) {
      return NextResponse.json(
        { error: 'VIP membership not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(membership);
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
  try {
    const { user_id } = await params;
    const data: UpdateVIPMembershipRequest = await request.json();

    const membership = await updateVIPMembership(user_id, data);

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
