import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

/**
 * Staff Auth Check API
 * GET /api/staff/auth/check
 */
export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('staff_session');

    if (!sessionCookie) {
      return NextResponse.json(
        { authenticated: false },
        { status: 401 }
      );
    }

    // Validate session token
    try {
      const decoded = JSON.parse(Buffer.from(sessionCookie.value, 'base64').toString());
      const now = Date.now();

      // Check if token is expired
      if (now > decoded.expires) {
        cookieStore.delete('staff_session');
        return NextResponse.json(
          { authenticated: false },
          { status: 401 }
        );
      }

      // Verify role
      if (decoded.role !== 'staff' && decoded.role !== 'admin') {
        cookieStore.delete('staff_session');
        return NextResponse.json(
          { authenticated: false },
          { status: 403 }
        );
      }

      return NextResponse.json({
        authenticated: true,
        user: {
          id: decoded.userId,
          name: decoded.name,
          email: decoded.email,
          role: decoded.role,
        },
      });

    } catch {
      cookieStore.delete('staff_session');
      return NextResponse.json(
        { authenticated: false },
        { status: 401 }
      );
    }

  } catch (error) {
    console.error('Auth check error:', error);
    return NextResponse.json(
      { authenticated: false },
      { status: 500 }
    );
  }
}
