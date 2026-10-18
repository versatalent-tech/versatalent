import { NextRequest } from 'next/server';
import { getFoundingPaymentStatus } from '@/lib/db/repositories/founding';
import { confirmFoundingPayment } from '@/lib/services/membership-payments';
import { ApiErrors, successResponse } from '@/lib/utils/api-response';
import { isValidUUID } from '@/lib/utils/validation';

export const dynamic = 'force-dynamic';

/**
 * GET /api/membership/founding/status?f=<purchase id> - for the thank-you
 * page after paying. Confirms with SumUp while still unpaid. Shows only a
 * first name, the dates and part of the postcode.
 */
export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get('f') ?? '';
  if (!isValidUUID(id)) return ApiErrors.NotFound('Membership');

  try {
    const before = await getFoundingPaymentStatus(id);
    if (!before) return ApiErrors.NotFound('Membership');
    if (before.status === 'pending') {
      await confirmFoundingPayment(id).catch((error) => console.error('Founding payment check failed:', error));
      return successResponse(await getFoundingPaymentStatus(id));
    }
    return successResponse(before);
  } catch (error) {
    console.error('Founding status error:', error);
    return ApiErrors.ServerError('Couldn’t check your membership');
  }
}
