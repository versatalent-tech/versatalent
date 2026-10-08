import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { sql } from '@/lib/db/client';
import {
  isAdminLoginConfigured,
  verifyAdminCredentials,
  createSessionToken,
  setSessionCookie,
} from '@/lib/auth/admin-auth';
import { signSession } from '@/lib/auth/session';
import { isTeamRole } from '@/lib/auth/permissions';
import { getClientIp, isLoginThrottled, recordLoginAttempt, THROTTLED_MESSAGE } from '@/lib/auth/login-throttle';
import { recordLogin } from '@/lib/db/repositories/team';

/**
 * Team sign-in (admin, manager, road manager).
 *
 * Team members sign in with their email and password. The admin login from
 * ADMIN_USERNAME / ADMIN_PASSWORD still works as a fallback account.
 */
export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json();

    if (!username || !password || typeof username !== 'string' || typeof password !== 'string') {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    const identifier = username.trim();
    const throttleKey = identifier.toLowerCase();
    const ip = getClientIp(request);

    if (await isLoginThrottled(throttleKey, ip)) {
      return NextResponse.json({ error: THROTTLED_MESSAGE }, { status: 429 });
    }

    // Fallback admin account from environment variables
    if (isAdminLoginConfigured() && verifyAdminCredentials(identifier, password)) {
      await setSessionCookie(await createSessionToken(identifier));
      await recordLoginAttempt(throttleKey, ip, true);
      return NextResponse.json({ success: true, role: 'admin' });
    }

    const rows = await sql`
      SELECT id, name, email, password_hash, role, is_active
      FROM users
      WHERE email = ${throttleKey}
      LIMIT 1
    `;
    const user = rows[0];

    const valid =
      user &&
      user.is_active &&
      isTeamRole(user.role) &&
      user.password_hash &&
      (await bcrypt.compare(password, user.password_hash));

    if (!valid) {
      await recordLoginAttempt(throttleKey, ip, false);
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    const token = await signSession({ userId: user.id, role: user.role, name: user.name, email: user.email });
    await setSessionCookie(token);
    await recordLoginAttempt(throttleKey, ip, true);
    await recordLogin(user.id);

    return NextResponse.json({ success: true, role: user.role });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'An error occurred during login' }, { status: 500 });
  }
}
