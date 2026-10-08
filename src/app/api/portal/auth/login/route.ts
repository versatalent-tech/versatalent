import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { sql } from '@/lib/db/client';
import { startTalentSession } from '@/lib/auth/talent-auth';
import { getClientIp, isLoginThrottled, recordLoginAttempt, THROTTLED_MESSAGE } from '@/lib/auth/login-throttle';
import { recordLogin } from '@/lib/db/repositories/team';

// POST /api/portal/auth/login - talent sign-in
export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json().catch(() => ({}));
    if (typeof email !== 'string' || typeof password !== 'string' || !email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }
    const normalized = email.trim().toLowerCase();
    const ip = getClientIp(request);

    if (await isLoginThrottled(normalized, ip)) {
      return NextResponse.json({ error: THROTTLED_MESSAGE }, { status: 429 });
    }

    const rows = await sql`
      SELECT id, name, email, password_hash FROM users
      WHERE email = ${normalized} AND role = 'artist' AND is_active AND talent_id IS NOT NULL
      LIMIT 1
    `;
    const user = rows[0];
    const valid = user?.password_hash && (await bcrypt.compare(password, user.password_hash));
    if (!valid) {
      await recordLoginAttempt(normalized, ip, false);
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    await startTalentSession(user);
    await recordLoginAttempt(normalized, ip, true);
    await recordLogin(user.id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Portal login error:', error);
    return NextResponse.json({ error: 'An error occurred during sign-in' }, { status: 500 });
  }
}
