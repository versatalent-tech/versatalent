import { requireTalent } from '@/lib/auth/talent-auth';
import { getRewards, getTalentBasics, listTalentBookings } from '@/lib/db/repositories/portal';
import { ApiErrors, successResponse } from '@/lib/utils/api-response';
import type { PortalHome } from '@/lib/portal/types';

export const dynamic = 'force-dynamic';

// GET /api/portal/home - the talent's overview
export async function GET() {
  const auth = await requireTalent();
  if ('response' in auth) return auth.response;
  const { talent } = auth;

  try {
    const [basics, upcoming, rewards] = await Promise.all([
      getTalentBasics(talent.talentId),
      listTalentBookings(talent.talentId, 'upcoming', 50),
      getRewards(talent),
    ]);
    const active = upcoming.filter((b) => b.status === 'hold' || b.status === 'confirmed');
    const home: PortalHome = {
      name: talent.name,
      talent_name: talent.talentName,
      profession: basics?.profession ?? '',
      image_src: basics?.image_src ?? null,
      next_bookings: active.slice(0, 5),
      awaiting_response: active.filter((b) => b.talent_response === 'pending' && b.can_respond),
      points_balance: rewards.membership?.points_balance ?? null,
      tier: rewards.membership?.tier ?? null,
      unlocked_perks: rewards.perks.filter((p) => p.unlocked).length,
    };
    return successResponse(home);
  } catch (error) {
    console.error('Portal home error:', error);
    return ApiErrors.ServerError('Failed to load your overview');
  }
}
