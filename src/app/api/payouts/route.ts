import { NextRequest } from 'next/server';
import { bookingContext } from '@/lib/bookings/route-helpers';
import { listOwedPayouts, listRecentPayouts } from '@/lib/db/repositories/bookings';
import { ApiErrors, successResponse } from '@/lib/utils/api-response';

export const dynamic = 'force-dynamic';

// GET /api/payouts?view=owed|paid - talents' pay still owed, or recently paid
export async function GET(request: NextRequest) {
  const ctx = await bookingContext('payouts.manage');
  if ('response' in ctx) return ctx.response;
  const view = request.nextUrl.searchParams.get('view') === 'paid' ? 'paid' : 'owed';
  try {
    return successResponse(view === 'paid' ? await listRecentPayouts(ctx.scope) : await listOwedPayouts(ctx.scope));
  } catch (error) {
    console.error('Error loading payouts:', error);
    return ApiErrors.ServerError('Failed to load payouts');
  }
}
