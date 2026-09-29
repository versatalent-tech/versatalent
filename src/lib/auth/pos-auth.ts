import { NextRequest, NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/middleware/auth';

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
    // Checks both admin and staff sessions (signature, expiry and role)
    const session = await getCurrentSession();

    if (!session) {
      return {
        authorized: false,
        error: 'Not authenticated. Please login.'
      };
    }

    return {
      authorized: true,
      userId: session.userId,
      role: session.role,
    };
  } catch (error) {
    console.error('checkPOSAuth error:', error);
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
