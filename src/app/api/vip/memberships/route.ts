import { NextRequest, NextResponse } from 'next/server';
import { getAllVIPMemberships, createVIPMembership } from '@/lib/db/repositories/vip-memberships';

// GET all VIP memberships
export async function GET(request: NextRequest) {
  try {
    const memberships = await getAllVIPMemberships();

    return NextResponse.json(memberships);
  } catch (error) {
    console.error('Error fetching VIP memberships:', error);
    return NextResponse.json(
      { error: 'Failed to fetch VIP memberships' },
      { status: 500 }
    );
  }
}

// POST create new VIP membership
export async function POST(request: NextRequest) {
  try {
    const data = await request.json();

    if (!data.user_id) {
      return NextResponse.json(
        { error: 'Missing required field: user_id' },
        { status: 400 }
      );
    }

    const membership = await createVIPMembership(data.user_id);

    return NextResponse.json(membership, { status: 201 });
  } catch (error: any) {
    console.error('Error creating VIP membership:', error);
    return NextResponse.json(
      { error: 'Failed to create VIP membership', details: error.message },
      { status: 500 }
    );
  }
}
