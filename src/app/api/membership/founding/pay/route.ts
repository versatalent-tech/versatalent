import { NextRequest } from 'next/server';
import { z } from 'zod';
import { restartFoundingPayment } from '@/lib/services/membership-payments';
import { getClientIp, isLoginThrottled, recordLoginAttempt } from '@/lib/auth/login-throttle';
import { ApiErrors, successResponse } from '@/lib/utils/api-response';

const schema = z.object({ membership_id: z.string().uuid() });

// POST /api/membership/founding/pay - start payment again for an unpaid Founding purchase
export async function POST(request: NextRequest) {
  const parsed = schema.safeParse(await request.json().catch(() => undefined));
  if (!parsed.success) return ApiErrors.NotFound('Membership');

  const ip = getClientIp(request);
  const key = `founding-pay:${parsed.data.membership_id}`;
  if (await isLoginThrottled(key, ip)) return ApiErrors.BadRequest('Too many attempts. Please try again in 15 minutes.');
  await recordLoginAttempt(key, ip, false);

  try {
    const result = await restartFoundingPayment(parsed.data.membership_id, request.nextUrl.origin);
    return 'error' in result ? ApiErrors.BadRequest(result.error) : successResponse({ paymentUrl: result.url });
  } catch (error) {
    console.error('Founding payment restart failed:', error);
    return ApiErrors.ServerError('Payment couldn’t start. Please try again shortly.');
  }
}
