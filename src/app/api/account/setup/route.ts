import { NextRequest } from 'next/server';
import { peekAuthLink, redeemAuthLink } from '@/lib/db/repositories/team';
import { logAudit } from '@/lib/db/repositories/audit-log';
import { getClientIp, isLoginThrottled, recordLoginAttempt } from '@/lib/auth/login-throttle';
import { ApiErrors, successResponse } from '@/lib/utils/api-response';
import { isValidPassword } from '@/lib/utils/validation';

export const dynamic = 'force-dynamic';

const INVALID_LINK = 'This link has expired or has already been used. Ask your admin for a new one.';

function readToken(value: unknown): string | null {
  return typeof value === 'string' && /^[A-Za-z0-9_-]{20,100}$/.test(value) ? value : null;
}

// GET /api/account/setup?token=... - is this link still valid, and whose is it?
export async function GET(request: NextRequest) {
  const token = readToken(request.nextUrl.searchParams.get('token'));
  if (!token) return ApiErrors.BadRequest(INVALID_LINK);

  const link = await peekAuthLink(token);
  if (!link) return ApiErrors.BadRequest(INVALID_LINK);

  return successResponse({ name: link.name, purpose: link.purpose });
}

// POST /api/account/setup - set a password using a one-time link
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const token = readToken(body.token);
    const password = typeof body.password === 'string' ? body.password : '';
    const ip = getClientIp(request);

    // Guessing tokens is hopeless (256 bits), but don't let anyone hammer the endpoint
    if (await isLoginThrottled('account-setup', ip)) {
      return ApiErrors.BadRequest('Too many attempts. Try again in 15 minutes.');
    }
    if (!token) {
      await recordLoginAttempt('account-setup', ip, false);
      return ApiErrors.BadRequest(INVALID_LINK);
    }

    const check = isValidPassword(password);
    if (!check.valid) return ApiErrors.BadRequest(check.errors.join('. '));

    const result = await redeemAuthLink(token, password);
    if (!result) {
      await recordLoginAttempt('account-setup', ip, false);
      return ApiErrors.BadRequest(INVALID_LINK);
    }

    await logAudit({ userId: result.userId, name: result.name }, `${result.purpose}_used`, 'team_member', result.userId);

    // Staff sign in at the till, talents at the portal, the team at the admin login
    const signInPath = result.role === 'staff' ? '/staff/login' : result.role === 'artist' ? '/portal/login' : '/admin/login';
    return successResponse({ signInPath }, 'Password set');
  } catch (error) {
    console.error('Error setting password from link:', error);
    return ApiErrors.ServerError('Failed to set password');
  }
}
