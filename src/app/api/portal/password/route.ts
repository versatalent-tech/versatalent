import { NextRequest } from 'next/server';
import bcrypt from 'bcryptjs';
import { sql } from '@/lib/db/client';
import { requireTalent } from '@/lib/auth/talent-auth';
import { parseBody } from '@/lib/crm/route-helpers';
import { passwordChangeSchema } from '@/lib/portal/schemas';
import { getClientIp, isLoginThrottled, recordLoginAttempt } from '@/lib/auth/login-throttle';
import { ApiErrors, successResponse } from '@/lib/utils/api-response';
import { isValidPassword } from '@/lib/utils/validation';

// POST /api/portal/password - change password (needs the current one)
export async function POST(request: NextRequest) {
  const auth = await requireTalent();
  if ('response' in auth) return auth.response;
  const body = await parseBody(request, passwordChangeSchema);
  if ('response' in body) return body.response;

  const ip = getClientIp(request);
  if (await isLoginThrottled(auth.talent.email, ip)) return ApiErrors.BadRequest('Too many attempts. Try again in 15 minutes.');

  const check = isValidPassword(body.data.new_password!);
  if (!check.valid) return ApiErrors.BadRequest(check.errors.join('. '));

  const rows = await sql`SELECT password_hash FROM users WHERE id = ${auth.talent.userId}`;
  const hash = rows[0]?.password_hash;
  if (!hash || !(await bcrypt.compare(body.data.current_password!, hash))) {
    await recordLoginAttempt(auth.talent.email, ip, false);
    return ApiErrors.BadRequest('Your current password is not right');
  }

  const newHash = await bcrypt.hash(body.data.new_password!, 10);
  await sql`UPDATE users SET password_hash = ${newHash}, updated_at = NOW() WHERE id = ${auth.talent.userId}`;
  return successResponse(null, 'Password changed');
}
