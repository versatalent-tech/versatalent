import { NextRequest, NextResponse } from 'next/server';
import { getUserById } from '@/lib/db/repositories/users';
import { cookies } from 'next/headers';

/**
 * Auth middleware for POS routes
 * Checks if user is authenticated and has staff or admin role
 */
export async function checkPOSAuth(request: NextRequest): Promise<{
  authorized: boolean;
  userId?: string;
  role?: string;
  error?: string;
}> {
  try {
    // Get session cookies - check both staff and admin sessions
    const cookieStore = await cookies();
    const staffSessionCookie = cookieStore.get('staff_session');
    const adminSessionCookie = cookieStore.get('admin_session');

    // Try staff session first
    if (staffSessionCookie) {
      try {
        const decoded = JSON.parse(Buffer.from(staffSessionCookie.value, 'base64').toString());
        const now = Date.now();

        // Check if token is expired
        if (now > decoded.expires) {
          return {
            authorized: false,
            error: 'Session expired. Please login again.'
          };
        }

        // Verify role
        if (decoded.role !== 'staff' && decoded.role !== 'admin') {
          return {
            authorized: false,
            error: 'Insufficient permissions. Staff access required.'
          };
        }

        return {
          authorized: true,
          userId: decoded.userId,
          role: decoded.role
        };
      } catch (err) {
        console.error('Staff session decode error:', err);
        // Fall through to try admin session
      }
    }

    // Try admin session
    if (adminSessionCookie) {
      try {
        const decoded = JSON.parse(Buffer.from(adminSessionCookie.value, 'base64').toString());
        const now = Date.now();

        // Check if token is expired
        if (now > decoded.expires) {
          return {
            authorized: false,
            error: 'Session expired. Please login again.'
          };
        }

        return {
          authorized: true,
          role: 'admin'
        };
      } catch (err) {
        console.error('Admin session decode error:', err);
        return {
          authorized: false,
          error: 'Invalid session. Please login again.'
        };
      }
    }

    // No valid session found
    return {
      authorized: false,
      error: 'Not authenticated. Please login.'
    };

  } catch (error) {
    console.error('POS auth check error:', error);
    return {
      authorized: false,
      error: 'Authentication failed'
    };
  }
}

/**
 * Wrapper for POS API routes to require authentication
 * Usage: export const GET = withPOSAuth(async (request, auth) => { ... });
 * For routes with params: export const GET = withPOSAuth(async (request, auth, context) => { ... });
 */
export function withPOSAuth<T = any>(
  handler: (
    request: NextRequest,
    auth: { userId?: string; role?: string },
    context?: T
  ) => Promise<Response>
) {
  return async (request: NextRequest, context?: T): Promise<Response> => {
    try {
      const authCheck = await checkPOSAuth(request);

      if (!authCheck.authorized) {
        return NextResponse.json(
          { error: authCheck.error || 'Unauthorized' },
          { status: 401 }
        );
      }

      // Call the actual handler with auth context and route context
      const response = await handler(
        request,
        {
          userId: authCheck.userId,
          role: authCheck.role
        },
        context
      );

      return response;
    } catch (error: any) {
      console.error('[withPOSAuth] Error:', error);
      return NextResponse.json(
        { error: 'Internal server error', details: error.message },
        { status: 500 }
      );
    }
  };
}

/**
 * Check if user has staff or admin role
 */
export function hasStaffAccess(role?: string): boolean {
  return role === 'staff' || role === 'admin';
}

/**
 * Check if user has admin role
 */
export function hasAdminAccess(role?: string): boolean {
  return role === 'admin';
}
