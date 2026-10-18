import { NextRequest } from 'next/server';
import { requireTeamPermission } from '@/lib/middleware/auth';
import { parseBody } from '@/lib/crm/route-helpers';
import { rewardSchema } from '@/lib/loyalty/schemas';
import { getReward, updateReward, type RewardInput } from '@/lib/db/repositories/loyalty';
import { logAudit } from '@/lib/db/repositories/audit-log';
import { ApiErrors, successResponse } from '@/lib/utils/api-response';
import { isValidUUID } from '@/lib/utils/validation';

// PUT /api/admin/rewards/[id] - edit, switch on or off. Claims already made keep their terms.
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireTeamPermission('venue.manage');
  if ('response' in auth) return auth.response;
  const { id } = await params;
  if (!isValidUUID(id)) return ApiErrors.NotFound('Reward');
  const body = await parseBody(request, rewardSchema);
  if ('response' in body) return body.response;
  try {
    const before = await getReward(id);
    if (!before) return ApiErrors.NotFound('Reward');
    const after = await updateReward(id, body.data as RewardInput, auth.session.userId ?? null);
    await logAudit({ userId: auth.session.userId, name: auth.session.name }, 'update', 'reward', id, { before, after });
    return successResponse(after, 'Saved');
  } catch (error) {
    console.error('Error saving reward:', error);
    return ApiErrors.ServerError('Failed to save');
  }
}
