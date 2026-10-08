/**
 * Signed session tokens
 *
 * Tokens are `base64url(JSON payload).base64url(HMAC-SHA256 signature)`,
 * signed with SESSION_SECRET. Uses Web Crypto so it runs in both Node route
 * handlers and Edge middleware. No next/headers import here on purpose.
 */

export const ADMIN_SESSION_COOKIE = 'admin_session';
export const STAFF_SESSION_COOKIE = 'staff_session';

// Session duration: 24 hours
export const SESSION_DURATION_MS = 24 * 60 * 60 * 1000;

// admin/staff run the venue tools; manager/road_manager are team roles that
// only reach the admin areas their permissions allow (see lib/auth/permissions)
export type SessionRole = 'admin' | 'staff' | 'manager' | 'road_manager';

const SESSION_ROLES: readonly string[] = ['admin', 'staff', 'manager', 'road_manager'];

export interface SessionPayload {
  userId?: string; // database user id; absent for the env-configured admin
  role: SessionRole;
  name?: string;
  email?: string;
  exp: number; // epoch ms
}

const DEV_FALLBACK_SECRET = 'dev-only-insecure-session-secret-never-use-in-prod';

function getSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (secret && secret.length >= 32) {
    return secret;
  }
  if (process.env.NODE_ENV === 'production') {
    throw new Error('SESSION_SECRET must be set (at least 32 characters) in production');
  }
  return DEV_FALLBACK_SECRET;
}

const encoder = new TextEncoder();
const decoder = new TextDecoder();

function toBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(value: string): Uint8Array<ArrayBuffer> {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((value.length + 3) % 4);
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function getKey(): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    encoder.encode(getSecret()),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  );
}

/**
 * Create a signed session token
 */
export async function signSession(
  data: Omit<SessionPayload, 'exp'>,
  durationMs: number = SESSION_DURATION_MS
): Promise<string> {
  const payload: SessionPayload = { ...data, exp: Date.now() + durationMs };
  const body = toBase64Url(encoder.encode(JSON.stringify(payload)));
  const signature = await crypto.subtle.sign('HMAC', await getKey(), encoder.encode(body));
  return `${body}.${toBase64Url(new Uint8Array(signature))}`;
}

/**
 * Verify a session token. Returns the payload if the signature is valid and
 * the session has not expired, otherwise null.
 */
export async function verifySession(token: string | undefined | null): Promise<SessionPayload | null> {
  if (!token) {
    return null;
  }

  const parts = token.split('.');
  if (parts.length !== 2) {
    return null;
  }
  const [body, signature] = parts;

  try {
    // crypto.subtle.verify is constant-time
    const valid = await crypto.subtle.verify(
      'HMAC',
      await getKey(),
      fromBase64Url(signature),
      encoder.encode(body)
    );
    if (!valid) {
      return null;
    }

    const payload = JSON.parse(decoder.decode(fromBase64Url(body))) as SessionPayload;

    if (typeof payload.exp !== 'number' || Date.now() > payload.exp) {
      return null;
    }
    if (!SESSION_ROLES.includes(payload.role)) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

export const SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  maxAge: SESSION_DURATION_MS / 1000,
  path: '/',
};
