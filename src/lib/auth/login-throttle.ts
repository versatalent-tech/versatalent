import { sql } from '@/lib/db/client';

/**
 * Throttle repeated failed sign-ins, per email and per IP address.
 * Used by both the team (admin) and staff logins.
 */

const WINDOW_MINUTES = 15;
const MAX_FAILURES_PER_EMAIL = 5;
const MAX_FAILURES_PER_IP = 20;

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  return (
    request.headers.get('x-nf-client-connection-ip') ||
    (forwarded ? forwarded.split(',')[0].trim() : '') ||
    request.headers.get('x-real-ip') ||
    'unknown'
  );
}

/** True when this email or IP has had too many recent failures */
export async function isLoginThrottled(email: string, ip: string): Promise<boolean> {
  const rows = await sql`
    SELECT
      COUNT(*) FILTER (WHERE email = ${email}) AS by_email,
      COUNT(*) FILTER (WHERE ip = ${ip}) AS by_ip
    FROM login_attempts
    WHERE success = false
      AND created_at > NOW() - make_interval(mins => ${WINDOW_MINUTES})
      AND (email = ${email} OR ip = ${ip})
  `;
  return Number(rows[0].by_email) >= MAX_FAILURES_PER_EMAIL || Number(rows[0].by_ip) >= MAX_FAILURES_PER_IP;
}

export async function recordLoginAttempt(email: string, ip: string, success: boolean): Promise<void> {
  try {
    await sql`INSERT INTO login_attempts (email, ip, success) VALUES (${email}, ${ip}, ${success})`;
  } catch (error) {
    // Never block a sign-in because the attempt couldn't be logged
    console.error('Failed to record login attempt:', error);
  }
}

export const THROTTLED_MESSAGE = `Too many failed attempts. Try again in ${WINDOW_MINUTES} minutes.`;
