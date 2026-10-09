import { NextRequest } from 'next/server';
import { getApplicationStatus, getPaymentTarget } from '@/lib/db/repositories/membership';
import { confirmCardPayment } from '@/lib/services/membership-payments';
import { ApiErrors, successResponse } from '@/lib/utils/api-response';
import { isValidUUID } from '@/lib/utils/validation';

export const dynamic = 'force-dynamic';

/**
 * GET /api/membership/status?r=<application id> - for the welcome page after
 * paying. Confirms the payment with SumUp if it's still pending. Shows only
 * a first name and part of the postcode.
 */
export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get('r') ?? '';
  if (!isValidUUID(id)) return ApiErrors.NotFound('Application');

  try {
    const target = await getPaymentTarget({ requestId: id });
    if (!target) return ApiErrors.NotFound('Application');
    if (target.payment_status === 'pending' && target.sumup_checkout_id) {
      await confirmCardPayment(target).catch((error) => console.error('Card payment check failed:', error));
    }
    return successResponse(await getApplicationStatus(id));
  } catch (error) {
    console.error('Membership status error:', error);
    return ApiErrors.ServerError('Couldn’t check your application');
  }
}
