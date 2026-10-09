import { NextRequest } from 'next/server';
import { z } from 'zod';
import { requireTeamPermission } from '@/lib/middleware/auth';
import { parseBody } from '@/lib/crm/route-helpers';
import { countCandidates, getCampaignSettings, listCandidates, updateCampaignSettings } from '@/lib/db/repositories/outreach';
import { logAudit } from '@/lib/db/repositories/audit-log';
import { CAMPAIGN_KEYS, type CampaignKey } from '@/lib/outreach/types';
import { ApiErrors, successResponse } from '@/lib/utils/api-response';

export const dynamic = 'force-dynamic';

// GET /api/admin/outreach?campaign=welcome - campaign settings, counts and who to contact
export async function GET(request: NextRequest) {
  const auth = await requireTeamPermission('venue.manage');
  if ('response' in auth) return auth.response;
  const requested = request.nextUrl.searchParams.get('campaign') as CampaignKey;
  const campaign = CAMPAIGN_KEYS.includes(requested) ? requested : 'founding_renewal';
  const origin = request.nextUrl.origin;
  try {
    const [settings, counts, candidates] = await Promise.all([getCampaignSettings(), countCandidates(origin), listCandidates(campaign, origin)]);
    return successResponse({ campaign, settings, counts, candidates });
  } catch (error) {
    console.error('Error loading outreach:', error);
    return ApiErrors.ServerError('Failed to load');
  }
}

const schema = z.object({
  campaign: z.enum(CAMPAIGN_KEYS),
  enabled: z.boolean().optional(),
  cooldown_days: z.number().int().min(0).max(3650).optional(),
  subject: z.string().trim().min(1).max(200).optional(),
  body: z.string().trim().min(1).max(5000).optional(),
});

// PUT /api/admin/outreach - switch a campaign on/off, cooldown, message template
export async function PUT(request: NextRequest) {
  const auth = await requireTeamPermission('venue.manage');
  if ('response' in auth) return auth.response;
  const body = await parseBody(request, schema);
  if ('response' in body) return body.response;
  const { campaign, ...changes } = body.data;
  try {
    const settings = await updateCampaignSettings(campaign, changes, auth.session.userId ?? null);
    await logAudit({ userId: auth.session.userId, name: auth.session.name }, 'update', 'outreach_campaign', null, { after: { campaign, ...changes } });
    return successResponse(settings, 'Saved');
  } catch (error) {
    console.error('Error saving outreach campaign:', error);
    return ApiErrors.ServerError('Failed to save');
  }
}
