import { NextRequest, NextResponse } from 'next/server';
import { getAllUsers, createUser, getUsersByRole } from '@/lib/db/repositories/users';

// GET all users or filter by role
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const role = searchParams.get('role');

    let users;
    if (role) {
      users = await getUsersByRole(role);
    } else {
      users = await getAllUsers();
    }

    // Remove sensitive data
    const sanitizedUsers = users.map(user => ({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      avatar_url: user.avatar_url,
      talent_id: user.talent_id,
      created_at: user.created_at,
      updated_at: user.updated_at
    }));

    return NextResponse.json(sanitizedUsers);
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}

// POST create new user
export async function POST(request: NextRequest) {
  try {
    const data = await request.json();

    // Validate required fields
    if (!data.name || !data.email || !data.role) {
      return NextResponse.json(
        { error: 'Missing required fields: name, email, role' },
        { status: 400 }
      );
    }

    // Validate role
    const validRoles = ['artist', 'vip', 'staff', 'admin'];
    if (!validRoles.includes(data.role)) {
      return NextResponse.json(
        { error: 'Invalid role' },
        { status: 400 }
      );
    }

    const user = await createUser(data);

    // Remove sensitive data
    const sanitizedUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      avatar_url: user.avatar_url,
      talent_id: user.talent_id,
      created_at: user.created_at,
      updated_at: user.updated_at
    };

    return NextResponse.json(sanitizedUser, { status: 201 });
  } catch (error: any) {
    console.error('Error creating user:', error);

    // Handle unique constraint violation (duplicate email)
    if (error.message?.includes('duplicate') || error.message?.includes('unique')) {
      return NextResponse.json(
        { error: 'A user with this email already exists' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create user' },
      { status: 500 }
    );
  }
}
