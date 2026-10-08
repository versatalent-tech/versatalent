import { requireTalent } from '@/lib/auth/talent-auth';
import { getEarnings } from '@/lib/db/repositories/portal';
import { ApiErrors, successResponse } from '@/lib/utils/api-response';

export const dynamic = 'force-dynamic';

// GET /api/portal/earnings - what the talent receives (net), this year and upcoming
export async function GET() {
  const auth = await requireTalent();
  if ('response' in auth) return auth.response;
  try {
    return successResponse(await getEarnings(auth.talent.talentId));
  } catch (error) {
    console.error('Portal earnings error:', error);
    return ApiErrors.ServerError('Failed to load your earnings');
  }
}
