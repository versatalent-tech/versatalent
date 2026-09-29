import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { STAFF_SESSION_COOKIE, verifySession } from '@/lib/auth/session';

/**
 * Staff Auth Check API
 * GET /api/staff/auth/check
 */
export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get(STAFF_SESSION_COOKIE);

    if (!sessionCookie) {
      return NextResponse.json(
        { authenticated: false },
        { status: 401 }
      );
    }

    // Validate signature, expiry and role
    const session = await verifySession(sessionCookie.value);

    if (!session) {
      cookieStore.delete(STAFF_SESSION_COOKIE);
      return NextResponse.json(
        { authenticated: false },
        { status: 401 }
      );
    }

    return NextResponse.json({
      authenticated: true,
      user: {
        id: session.userId,
        name: session.name,
        email: session.email,
        role: session.role,
      },
    });

  } catch (error) {
    console.error('Auth check error:', error);
    return NextResponse.json(
      { authenticated: false },
      { status: 500 }
    );
  }
}
