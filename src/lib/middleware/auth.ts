/**
 * Centralized Authentication Middleware
 * Handles admin and staff authentication checks across all API routes
 */

import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';
import { ApiErrors } from '@/lib/utils/api-response';
import {
  ADMIN_SESSION_COOKIE,
  STAFF_SESSION_COOKIE,
  verifySession,
  type SessionPayload,
} from '@/lib/auth/session';

// Legacy unsigned cookies from the old auth scheme - only ever deleted now
const LEGACY_COOKIES = ['admin_auth', 'staff_auth'];

/**
 * Get the current signed session (admin session takes precedence)
 */
export async function getCurrentSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();

  for (const name of [ADMIN_SESSION_COOKIE, STAFF_SESSION_COOKIE]) {
    const session = await verifySession(cookieStore.get(name)?.value);
    if (session) {
      return session;
    }
  }

  return null;
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
  return session?.role ?? null;
}
