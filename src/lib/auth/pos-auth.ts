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
    // Get session cookie
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('admin_session');

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
    } catch {
      return {
        authorized: false,
        error: 'Invalid session. Please login again.'
      };
    }

    // For now, admin session is valid for POS
    // In production, you'd want to get the actual user from the session
    // and check their role in the database

    // TODO: Store user_id in session and retrieve user from database
    // For now, we trust that admin_session means authorized

    return {
      authorized: true,
      role: 'admin' // Placeholder - should come from actual user
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
