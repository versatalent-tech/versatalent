import { cookies } from 'next/headers';
import { createHash, timingSafeEqual } from 'crypto';
import {
  ADMIN_SESSION_COOKIE,
  SESSION_COOKIE_OPTIONS,
  signSession,
  verifySession,
} from '@/lib/auth/session';

/**
 * Whether admin credentials are configured. There are deliberately no
 * defaults: without ADMIN_USERNAME and ADMIN_PASSWORD, admin login is disabled.
 */
export function isAdminLoginConfigured(): boolean {
  return Boolean(process.env.ADMIN_USERNAME && process.env.ADMIN_PASSWORD);
}

function safeEqual(a: string, b: string): boolean {
  // Hash first so both buffers have equal length for timingSafeEqual
  const hashA = createHash('sha256').update(a).digest();
  const hashB = createHash('sha256').update(b).digest();
  return timingSafeEqual(hashA, hashB);
}

/**
 * Verify admin credentials
 */
export function verifyAdminCredentials(username: string, password: string): boolean {
  const expectedUsername = process.env.ADMIN_USERNAME;
  const expectedPassword = process.env.ADMIN_PASSWORD;

  if (!expectedUsername || !expectedPassword) {
    return false;
  }

  // Evaluate both so timing doesn't reveal which one was wrong
  const usernameMatches = safeEqual(username, expectedUsername);
  const passwordMatches = safeEqual(password, expectedPassword);
  return usernameMatches && passwordMatches;
}

/**
 * Create a signed admin session token
 */
export function createSessionToken(username: string): Promise<string> {
  return signSession({ role: 'admin', name: username });
}

/**
 * Validate an admin session token (signature, expiry and admin role)
 */
export async function validateSessionToken(token: string): Promise<boolean> {
  const session = await verifySession(token);
  return session?.role === 'admin';
}

/**
 * Set session cookie
 */
export async function setSessionCookie(token: string) {
  const cookieStore = await cookies();
  cookieStore.set(ADMIN_SESSION_COOKIE, token, SESSION_COOKIE_OPTIONS);
}

/**
 * Get session cookie
 */
export async function getSessionCookie(): Promise<string | undefined> {
  try {
    const cookieStore = await cookies();
    return cookieStore.get(ADMIN_SESSION_COOKIE)?.value;
  } catch (error) {
    console.error('[getSessionCookie] Error accessing cookies:', error);
    return undefined;
  }
}

/**
 * Clear session cookie (logout)
 */
export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(ADMIN_SESSION_COOKIE);
}

/**
 * Check if user is authenticated
 */
export async function isAuthenticated(): Promise<boolean> {
  try {
    const token = await getSessionCookie();

    if (!token) {
      return false;
    }

    return await validateSessionToken(token);
  } catch (error) {
    console.error('[isAuthenticated] Error:', error);
    return false;
  }
}

/**
 * Get redirect URL for unauthenticated users
 */
export function getLoginRedirectUrl(returnTo?: string): string {
  const base = '/admin/login';
  if (returnTo) {
    return `${base}?returnTo=${encodeURIComponent(returnTo)}`;
  }
  return base;
}
