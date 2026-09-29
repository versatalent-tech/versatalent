import { NextRequest, NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/middleware/auth';

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
      name: session.name,
    };
  } catch (error) {
    console.error('checkStaffAuth error:', error);
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
