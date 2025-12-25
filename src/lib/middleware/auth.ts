/**
 * Centralized Authentication Middleware
 * Handles admin and staff authentication checks across all API routes
 */

import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { ApiErrors } from '@/lib/utils/api-response';

/**
 * Verify admin authentication
 */
export async function verifyAdminAuth(request?: NextRequest): Promise<boolean> {
  const cookieStore = await cookies();
  const adminAuth = cookieStore.get('admin_auth');
  return adminAuth?.value === 'true';
}

/**
 * Verify staff authentication
 */
export async function verifyStaffAuth(request?: NextRequest): Promise<boolean> {
  const cookieStore = await cookies();
  const staffAuth = cookieStore.get('staff_auth');
  return staffAuth?.value === 'true';
}

/**
 * Middleware wrapper to protect admin-only routes
 * Returns a higher-order function that wraps the route handler
 * Compatible with Next.js 14+ async params
 */
export function withAdminAuth<T>(
  handler: (request: Request, context?: any) => Promise<T>
) {
  return async (
    request: Request,
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
  handler: (request: Request, context?: any) => Promise<T>
) {
  return async (
    request: Request,
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
  handler: (request: Request, context?: any) => Promise<T>
) {
  return async (
    request: Request,
    context?: any
  ) => {
    const isAdmin = await verifyAdminAuth();
    const isStaff = await verifyStaffAuth();

    if (!isAdmin && !isStaff) {
      return ApiErrors.Unauthorized('Authentication required');
    }

    return handler(request, context);
  };
}

/**
 * Set admin authentication cookie
 */
export async function setAdminAuth() {
  const cookieStore = await cookies();
  cookieStore.set('admin_auth', 'true', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24, // 24 hours
  });
}

/**
 * Clear admin authentication cookie
 */
export async function clearAdminAuth() {
  const cookieStore = await cookies();
  cookieStore.delete('admin_auth');
}

/**
 * Set staff authentication cookie
 */
export async function setStaffAuth() {
  const cookieStore = await cookies();
  cookieStore.set('staff_auth', 'true', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24, // 24 hours
  });
}

/**
 * Clear staff authentication cookie
 */
export async function clearStaffAuth() {
  const cookieStore = await cookies();
  cookieStore.delete('staff_auth');
}

/**
 * Check if request has valid authentication
 * Returns { type: 'admin' | 'staff' | null }
 */
export async function getAuthType(): Promise<'admin' | 'staff' | null> {
  const isAdmin = await verifyAdminAuth();
  if (isAdmin) return 'admin';

  const isStaff = await verifyStaffAuth();
  if (isStaff) return 'staff';

  return null;
}
