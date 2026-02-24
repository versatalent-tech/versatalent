import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

/**
 * Staff Auth Middleware
 * Checks if user is authenticated as staff or admin
 */
export async function checkStaffAuth(request: NextRequest): Promise<{
  authorized: boolean;
  userId?: string;
  role?: string;
  name?: string;
  error?: string;
}> {
  try {
    // Check for staff session or admin session
    const cookieStore = await cookies();
    const staffSession = cookieStore.get('staff_session');
    const adminSession = cookieStore.get('admin_session');

    const sessionCookie = staffSession || adminSession;

    if (!sessionCookie) {
      return {
        authorized: false,
        error: 'Not authenticated. Please login.'
      };
    }

    // Validate session token
    try {
      const decoded = JSON.parse(Buffer.from(sessionCookie.value, 'base64').toString());
      const now = Date.now();

      // Check if token is expired
      if (now > decoded.expires) {
        return {
          authorized: false,
          error: 'Session expired. Please login again.'
        };
      }

      // For admin session, the role might not be in the decoded data
      // but we can infer it from the cookie type
      const role = decoded.role || (adminSession ? 'admin' : undefined);

      // Verify role (staff or admin only)
      if (role !== 'staff' && role !== 'admin') {
        return {
          authorized: false,
          error: 'Access denied. Staff credentials required.'
        };
      }

      return {
        authorized: true,
        userId: decoded.userId,
        role: role,
        name: decoded.name
      };

    } catch {
      return {
        authorized: false,
        error: 'Invalid session. Please login again.'
      };
    }

  } catch (error) {
    console.error('Staff auth check error:', error);
    return {
      authorized: false,
      error: 'Authentication failed'
    };
  }
}

/**
 * Wrapper for staff-only API routes
 * Usage: export const GET = withStaffAuth(async (request, auth) => { ... });
 */
export function withStaffAuth<T = unknown>(
  handler: (
    request: NextRequest,
    auth: { userId?: string; role?: string; name?: string },
    context?: T
  ) => Promise<Response>
) {
  return async (request: NextRequest, context?: T): Promise<Response> => {
    try {
      const authCheck = await checkStaffAuth(request);

      if (!authCheck.authorized) {
        return NextResponse.json(
          { error: authCheck.error || 'Unauthorized' },
          { status: 401 }
        );
      }

      // Call the actual handler with auth context
      const response = await handler(
        request,
        {
          userId: authCheck.userId,
          role: authCheck.role,
          name: authCheck.name
        },
        context
      );

      return response;
    } catch (error: unknown) {
      console.error('[withStaffAuth] Error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Internal server error';
      return NextResponse.json(
        { error: 'Internal server error', details: errorMessage },
        { status: 500 }
      );
    }
  };
}

/**
 * Check if user has admin role
 */
export function hasAdminAccess(role?: string): boolean {
  return role === 'admin';
}
