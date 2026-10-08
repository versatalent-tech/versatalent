import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db/client';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import {
  STAFF_SESSION_COOKIE,
  SESSION_COOKIE_OPTIONS,
  signSession,
} from '@/lib/auth/session';
import { getClientIp, isLoginThrottled, recordLoginAttempt, THROTTLED_MESSAGE } from '@/lib/auth/login-throttle';
import { recordLogin } from '@/lib/db/repositories/team';

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

    const normalizedEmail = String(email).trim().toLowerCase();
    const ip = getClientIp(request);

    if (await isLoginThrottled(normalizedEmail, ip)) {
      return NextResponse.json({ success: false, error: THROTTLED_MESSAGE }, { status: 429 });
    }

    // Find user by email
    const users = await sql`
      SELECT id, name, email, password_hash, role
      FROM users
      WHERE email = ${normalizedEmail} AND is_active = true
      LIMIT 1
    `;

    if (users.length === 0) {
      await recordLoginAttempt(normalizedEmail, ip, false);
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
      await recordLoginAttempt(normalizedEmail, ip, false);
      return NextResponse.json(
        { success: false, error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Create signed session
    const sessionToken = await signSession({
      userId: user.id,
      role: user.role,
      name: user.name,
      email: user.email,
    });

    const cookieStore = await cookies();
    cookieStore.set(STAFF_SESSION_COOKIE, sessionToken, SESSION_COOKIE_OPTIONS);
    await recordLoginAttempt(normalizedEmail, ip, true);
    await recordLogin(user.id);

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
