import { NextRequest } from 'next/server';
import { requireTalent } from '@/lib/auth/talent-auth';
import { listTalentBookings } from '@/lib/db/repositories/portal';
import { ApiErrors, successResponse } from '@/lib/utils/api-response';

export const dynamic = 'force-dynamic';

// GET /api/portal/bookings?when=upcoming|past
export async function GET(request: NextRequest) {
  const auth = await requireTalent();
  if ('response' in auth) return auth.response;
  const when = request.nextUrl.searchParams.get('when') === 'past' ? 'past' : 'upcoming';
  try {
    return successResponse(await listTalentBookings(auth.talent.talentId, when));
  } catch (error) {
    console.error('Portal bookings error:', error);
    return ApiErrors.ServerError('Failed to load your bookings');
  }
}
