import { NextRequest } from 'next/server';
import { z } from 'zod';
import { sql } from '@/lib/db/client';
import { getFoundingSettings, preparePurchase } from '@/lib/db/repositories/founding';
import { getProgrammeSettings } from '@/lib/db/repositories/membership';
import { startFoundingPayment } from '@/lib/services/membership-payments';
import { getClientIp, isLoginThrottled, recordLoginAttempt } from '@/lib/auth/login-throttle';
import { ApiErrors, successResponse } from '@/lib/utils/api-response';

export const dynamic = 'force-dynamic';

const schema = z.object({ member: z.string().uuid(), accept_terms: z.literal(true) });

/**
 * POST /api/membership/founding/buy { member, accept_terms } - an existing
 * member buys (or renews) from their pass page. Returns SumUp's payment page.
 */
export async function POST(request: NextRequest) {
  const parsed = schema.safeParse(await request.json().catch(() => undefined));
  if (!parsed.success) return ApiErrors.BadRequest('Please accept the membership terms to continue');
  const memberId = parsed.data.member;

  const ip = getClientIp(request);
  const key = `founding-buy:${memberId}`;
  if (await isLoginThrottled(key, ip)) return ApiErrors.BadRequest('Too many attempts. Please try again in 15 minutes.');
  await recordLoginAttempt(key, ip, false);

  try {
    const member = await sql`SELECT id FROM users WHERE id = ${memberId} AND role IN ('vip', 'artist') AND is_active LIMIT 1`;
    if (member.length === 0) return ApiErrors.NotFound('Member');

    const [founding, programme] = await Promise.all([getFoundingSettings(), getProgrammeSettings()]);
    const prepared = await preparePurchase(memberId, founding, programme.terms_version);
    if ('error' in prepared) return ApiErrors.BadRequest(prepared.error);

    const payment = await startFoundingPayment(prepared.purchase, request.nextUrl.origin);
    return 'error' in payment
      ? ApiErrors.BadRequest(payment.error)
      : successResponse({ paymentUrl: payment.url, membershipId: prepared.purchase.id });
  } catch (error) {
    console.error('Founding purchase failed to start:', error);
    return ApiErrors.ServerError('Payment couldn’t start. Please try again shortly.');
  }
}
