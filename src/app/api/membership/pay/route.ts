import { NextRequest } from 'next/server';
import { z } from 'zod';
import { startCardPayment } from '@/lib/services/membership-payments';
import { getClientIp, isLoginThrottled, recordLoginAttempt } from '@/lib/auth/login-throttle';
import { ApiErrors, successResponse } from '@/lib/utils/api-response';

const schema = z.object({ request_id: z.string().uuid() });

// POST /api/membership/pay - start payment again for an unpaid application
export async function POST(request: NextRequest) {
  const parsed = schema.safeParse(await request.json().catch(() => undefined));
  if (!parsed.success) return ApiErrors.NotFound('Application');

  const ip = getClientIp(request);
  const key = `membership-pay:${parsed.data.request_id}`;
  if (await isLoginThrottled(key, ip)) return ApiErrors.BadRequest('Too many attempts. Please try again in 15 minutes.');
  await recordLoginAttempt(key, ip, false);

  try {
    const result = await startCardPayment(parsed.data.request_id, request.nextUrl.origin);
    return 'error' in result ? ApiErrors.BadRequest(result.error) : successResponse({ paymentUrl: result.url });
  } catch (error) {
    console.error('Card payment restart failed:', error);
    return ApiErrors.ServerError('Payment couldn’t start. Please try again shortly.');
  }
}
