import { NextRequest, NextResponse } from 'next/server';
import { getAllUsers, getUserByTalentId } from '@/lib/db/repositories/users';

// GET all users or filter by talent_id
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const talentId = searchParams.get('talentId');

    // If talent_id is provided, get user by talent_id
    if (talentId) {
      const user = await getUserByTalentId(talentId);
      return NextResponse.json(user ? [user] : []);
    }

    // Otherwise get all users
    const users = await getAllUsers();

    // Remove password_hash from response
    const sanitizedUsers = users.map(({ password_hash, ...user }) => user);

    return NextResponse.json(sanitizedUsers);
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}
