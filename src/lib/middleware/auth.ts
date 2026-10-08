/**
 * Centralized Authentication Middleware
 * Handles admin and staff authentication checks across all API routes
 */

import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';
import { ApiErrors } from '@/lib/utils/api-response';
import { sql } from '@/lib/db/client';
import { can, isTeamRole, type Permission, type TeamRole } from '@/lib/auth/permissions';
import {
  ADMIN_SESSION_COOKIE,
  STAFF_SESSION_COOKIE,
  verifySession,
  type SessionPayload,
} from '@/lib/auth/session';

// Legacy unsigned cookies from the old auth scheme - only ever deleted now
const LEGACY_COOKIES = ['admin_auth', 'staff_auth'];

/**
 * Get the current admin or staff session (admin session takes precedence).
 *
 * Only admin and staff count here: this is what the POS, event-day and
 * check-in tools trust. Manager and road manager sessions are deliberately
 * ignored; use getTeamSession() for the team areas.
 */
export async function getCurrentSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();

  for (const name of [ADMIN_SESSION_COOKIE, STAFF_SESSION_COOKIE]) {
    const session = await verifySession(cookieStore.get(name)?.value);
    if (session && (session.role === 'admin' || session.role === 'staff')) {
      return session;
    }
  }

  return null;
}

export interface TeamSession extends SessionPayload {
  role: TeamRole;
}

/**
 * Get the current team session (admin, manager, road manager).
 *
 * For database accounts the role and active flag are re-read on every call,
 * so a role change or deactivation takes effect immediately rather than when
 * the 24-hour cookie expires.
 */
export async function getTeamSession(): Promise<TeamSession | null> {
  const cookieStore = await cookies();
  const session = await verifySession(cookieStore.get(ADMIN_SESSION_COOKIE)?.value);

  if (!session) {
    return null;
  }

  // The env-configured admin has no database row
  if (!session.userId) {
    return session.role === 'admin' ? (session as TeamSession) : null;
  }

  const rows = await sql`
    SELECT role, name, email FROM users WHERE id = ${session.userId} AND is_active = true LIMIT 1
  `;
  const user = rows[0];
  if (!user || !isTeamRole(user.role)) {
    return null;
  }

  return { ...session, role: user.role, name: user.name, email: user.email };
}

/**
 * Inline guard for team route handlers. Returns either the session or a
 * response to send back (401 when not signed in, 403 when not allowed).
 * Usage: const auth = await requireTeamPermission('dashboard.view');
 *        if ('response' in auth) return auth.response;
 */
export async function requireTeamPermission(
  permission: Permission
): Promise<{ session: TeamSession } | { response: Response }> {
  const session = await getTeamSession();
  if (!session) {
    return { response: ApiErrors.Unauthorized('Please sign in') };
  }
  if (!can(session.role, permission)) {
    return { response: ApiErrors.Forbidden('You do not have access to this') };
  }
  return { session };
}

/**
 * Verify admin authentication
 */
export async function verifyAdminAuth(request?: NextRequest): Promise<boolean> {
  const session = await getCurrentSession();
  return session?.role === 'admin';
}

/**
 * Verify staff authentication (admins also count as staff)
 */
export async function verifyStaffAuth(request?: NextRequest): Promise<boolean> {
  const session = await getCurrentSession();
  return session !== null;
}

/**
 * Inline guard for route handlers: returns a 401 response to send back,
 * or null when the caller is an admin.
 * Usage: const denied = await requireAdmin(); if (denied) return denied;
 */
export async function requireAdmin() {
  return (await verifyAdminAuth()) ? null : ApiErrors.Unauthorized('Admin authentication required');
}

/**
 * Inline guard for route handlers: returns a 401 response to send back,
 * or null when the caller is staff or an admin.
 */
export async function requireStaff() {
  return (await verifyStaffAuth()) ? null : ApiErrors.Unauthorized('Staff authentication required');
}

/**
 * Middleware wrapper to protect admin-only routes
 * Returns a higher-order function that wraps the route handler
 * Compatible with Next.js 14+ async params
 */
export function withAdminAuth<T>(
  handler: (request: NextRequest, context?: any) => Promise<T>
) {
  return async (
    request: NextRequest,
    context?: any
  ) => {
    const isAuthenticated = await verifyAdminAuth();

    if (!isAuthenticated) {
      return ApiErrors.Unauthorized('Admin authentication required');
    }

    return handler(request, context);
  };
}

/**
 * Middleware wrapper to protect staff-only routes
 * Returns a higher-order function that wraps the route handler
 * Compatible with Next.js 14+ async params
 */
export function withStaffAuth<T>(
  handler: (request: NextRequest, context?: any) => Promise<T>
) {
  return async (
    request: NextRequest,
    context?: any
  ) => {
    const isAuthenticated = await verifyStaffAuth();

    if (!isAuthenticated) {
      return ApiErrors.Unauthorized('Staff authentication required');
    }

    return handler(request, context);
  };
}

/**
 * Middleware wrapper to allow either admin or staff
 * Compatible with Next.js 14+ async params
 */
export function withAuth<T>(
  handler: (request: NextRequest, context?: any) => Promise<T>
) {
  return async (
    request: NextRequest,
    context?: any
  ) => {
    const isAuthenticated = await verifyStaffAuth();

    if (!isAuthenticated) {
      return ApiErrors.Unauthorized('Authentication required');
    }

    return handler(request, context);
  };
}

/**
 * Clear admin session cookie (plus the legacy unsigned cookies)
 */
export async function clearAdminAuth() {
  const cookieStore = await cookies();
  cookieStore.delete(ADMIN_SESSION_COOKIE);
  LEGACY_COOKIES.forEach((name) => cookieStore.delete(name));
}

/**
 * Clear staff session cookie (plus the legacy unsigned cookies)
 */
export async function clearStaffAuth() {
  const cookieStore = await cookies();
  cookieStore.delete(STAFF_SESSION_COOKIE);
  LEGACY_COOKIES.forEach((name) => cookieStore.delete(name));
}

/**
 * Check if request has valid authentication
 * Returns { type: 'admin' | 'staff' | null }
 */
export async function getAuthType(): Promise<'admin' | 'staff' | null> {
  const session = await getCurrentSession();
  // getCurrentSession only ever returns admin or staff sessions
  return (session?.role as 'admin' | 'staff' | undefined) ?? null;
}
