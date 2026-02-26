import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db/client';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import { setStaffAuth } from '@/lib/middleware/auth';

/**
 * Staff Login API
 * POST /api/staff/login
 *
 * Authenticates staff/admin users and creates a session
 */
export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    // Validate input
    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Find user by email
    const users = await sql`
      SELECT id, name, email, password_hash, role
      FROM users
      WHERE email = ${email.toLowerCase()}
      LIMIT 1
    `;

    if (users.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    const user = users[0];

    // Verify role (must be staff or admin)
    if (user.role !== 'staff' && user.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Access denied. Staff credentials required.' },
        { status: 403 }
      );
    }

    // Verify password
    if (!user.password_hash) {
      return NextResponse.json(
        { success: false, error: 'Invalid account configuration' },
        { status: 401 }
      );
    }

    const passwordMatch = await bcrypt.compare(password, user.password_hash);

    if (!passwordMatch) {
      return NextResponse.json(
        { success: false, error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Create session
    const sessionData = {
      userId: user.id,
      role: user.role,
      name: user.name,
      email: user.email,
      expires: Date.now() + (24 * 60 * 60 * 1000), // 24 hours
    };

    const sessionToken = Buffer.from(JSON.stringify(sessionData)).toString('base64');

    // Set secure cookie
    const cookieStore = await cookies();
    cookieStore.set('staff_session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60, // 24 hours
      path: '/',
    });

    // Also set the staff_auth cookie that the middleware expects
    await setStaffAuth();

    // Return success with user data (no sensitive info)
    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });

  } catch (error: unknown) {
    console.error('Staff login error:', error);
    return NextResponse.json(
      { success: false, error: 'Login failed. Please try again.' },
      { status: 500 }
    );
  }
}
