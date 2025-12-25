import { cookies } from 'next/headers';

// Admin credentials from environment variables
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'changeme';
const SESSION_COOKIE_NAME = 'admin_session';
const SESSION_SECRET = process.env.SESSION_SECRET || 'default-secret-change-in-production';

// Session duration: 24 hours
const SESSION_DURATION = 24 * 60 * 60 * 1000;

/**
 * Verify admin credentials
 */
export function verifyAdminCredentials(username: string, password: string): boolean {
  return username === ADMIN_USERNAME && password === ADMIN_PASSWORD;
}

/**
 * Create a session token
 */
export function createSessionToken(): string {
  const timestamp = Date.now();
  const randomPart = Math.random().toString(36).substring(2);
  const token = `${timestamp}-${randomPart}`;

  // In production, use proper JWT or encrypted tokens
  return Buffer.from(JSON.stringify({
    token,
    created: timestamp,
    expires: timestamp + SESSION_DURATION
  })).toString('base64');
}

/**
 * Validate session token
 */
export function validateSessionToken(token: string): boolean {
  try {
    const decoded = JSON.parse(Buffer.from(token, 'base64').toString());
    const now = Date.now();

    // Check if token is expired
    if (now > decoded.expires) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

/**
 * Set session cookie
 */
export async function setSessionCookie(token: string) {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_DURATION / 1000, // Convert to seconds
    path: '/',
  });
}

/**
 * Get session cookie
 */
export async function getSessionCookie(): Promise<string | undefined> {
  try {
    console.log('[getSessionCookie] Accessing cookies...');
    const cookieStore = await cookies();
    console.log('[getSessionCookie] Cookie store obtained');

    const cookie = cookieStore.get(SESSION_COOKIE_NAME);
    console.log('[getSessionCookie] Cookie value:', cookie ? 'exists' : 'not found');

    return cookie?.value;
  } catch (error) {
    console.error('[getSessionCookie] Error accessing cookies:', error);
    // Return undefined instead of throwing
    return undefined;
  }
}

/**
 * Clear session cookie (logout)
 */
export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

/**
 * Check if user is authenticated
 */
export async function isAuthenticated(): Promise<boolean> {
  try {
    console.log('[isAuthenticated] Getting session cookie...');
    const token = await getSessionCookie();

    console.log('[isAuthenticated] Token found:', !!token);

    if (!token) {
      return false;
    }

    const isValid = validateSessionToken(token);
    console.log('[isAuthenticated] Token valid:', isValid);

    return isValid;
  } catch (error) {
    console.error('[isAuthenticated] Error:', error);
    // Return false instead of throwing - graceful degradation
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
