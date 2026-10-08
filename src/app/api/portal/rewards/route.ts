import { requireTalent } from '@/lib/auth/talent-auth';
import { getRewards } from '@/lib/db/repositories/portal';
import { ApiErrors, successResponse } from '@/lib/utils/api-response';

export const dynamic = 'force-dynamic';

// GET /api/portal/rewards - points, tier progress, tier benefits and artist perks
export async function GET() {
  const auth = await requireTalent();
  if ('response' in auth) return auth.response;
  try {
    return successResponse(await getRewards(auth.talent));
  } catch (error) {
    console.error('Portal rewards error:', error);
    return ApiErrors.ServerError('Failed to load your rewards');
  }
}
