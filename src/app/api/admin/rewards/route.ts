import { NextRequest } from 'next/server';
import { z } from 'zod';
import { requireTeamPermission } from '@/lib/middleware/auth';
import { parseBody } from '@/lib/crm/route-helpers';
import { rewardSchema } from '@/lib/loyalty/schemas';
import {
  createReward,
  getLoyaltySettings,
  listRewards,
  rewardsReport,
  updateLoyaltySettings,
  upcomingEvents,
  type RewardInput,
} from '@/lib/db/repositories/loyalty';
import { logAudit } from '@/lib/db/repositories/audit-log';
import { ApiErrors, successResponse } from '@/lib/utils/api-response';

export const dynamic = 'force-dynamic';

// GET /api/admin/rewards - settings, rewards with usage, report, upcoming events
export async function GET() {
  const auth = await requireTeamPermission('venue.manage');
  if ('response' in auth) return auth.response;
  try {
    const [settings, report] = await Promise.all([getLoyaltySettings(), rewardsReport()]);
    const [rewards, events] = await Promise.all([listRewards(), upcomingEvents()]);
    return successResponse({ settings, rewards, report, events });
  } catch (error) {
    console.error('Error loading rewards:', error);
    return ApiErrors.ServerError('Failed to load');
  }
}

const settingsSchema = z.object({
  rewards_open: z.boolean().optional(),
  reward_earn_percent: z.number().int().min(0).max(1000).optional(),
});

// PUT /api/admin/rewards - open/close claiming, reward points earned as % of status points
export async function PUT(request: NextRequest) {
  const auth = await requireTeamPermission('venue.manage');
  if ('response' in auth) return auth.response;
  const body = await parseBody(request, settingsSchema);
  if ('response' in body) return body.response;
  try {
    const before = await getLoyaltySettings();
    const after = await updateLoyaltySettings(body.data, auth.session.userId ?? null);
    await logAudit({ userId: auth.session.userId, name: auth.session.name }, 'update', 'loyalty_settings', null, { before, after });
    return successResponse(after, 'Saved');
  } catch (error) {
    console.error('Error saving loyalty settings:', error);
    return ApiErrors.ServerError('Failed to save');
  }
}

// POST /api/admin/rewards - add a reward
export async function POST(request: NextRequest) {
  const auth = await requireTeamPermission('venue.manage');
  if ('response' in auth) return auth.response;
  const body = await parseBody(request, rewardSchema);
  if ('response' in body) return body.response;
  try {
    const reward = await createReward(body.data as RewardInput, auth.session.userId ?? null);
    await logAudit({ userId: auth.session.userId, name: auth.session.name }, 'create', 'reward', reward.id, { after: reward });
    return successResponse(reward, 'Reward added');
  } catch (error) {
    console.error('Error adding reward:', error);
    return ApiErrors.ServerError('Failed to save');
  }
}
