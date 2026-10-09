import { NextRequest } from 'next/server';
import { z } from 'zod';
import { requireTeamPermission } from '@/lib/middleware/auth';
import { parseBody } from '@/lib/crm/route-helpers';
import { listOutreachLog, logContacts } from '@/lib/db/repositories/outreach';
import { CAMPAIGN_KEYS, CHANNELS, type Channel } from '@/lib/outreach/types';
import { ApiErrors, successResponse } from '@/lib/utils/api-response';

export const dynamic = 'force-dynamic';

// GET /api/admin/outreach/log - recent contacts
export async function GET() {
  const auth = await requireTeamPermission('venue.manage');
  if ('response' in auth) return auth.response;
  try {
    return successResponse(await listOutreachLog());
  } catch (error) {
    console.error('Error loading outreach log:', error);
    return ApiErrors.ServerError('Failed to load');
  }
}

const schema = z.object({
  campaign: z.enum(CAMPAIGN_KEYS),
  channel: z.enum(Object.keys(CHANNELS) as [Channel, ...Channel[]]),
  note: z.string().trim().max(300).optional(),
  entries: z
    .array(z.object({ user_id: z.string().uuid(), dedupe_key: z.string().max(200).nullable() }))
    .min(1)
    .max(500),
});

// POST /api/admin/outreach/log - mark members as contacted (or skipped) for a campaign
export async function POST(request: NextRequest) {
  const auth = await requireTeamPermission('venue.manage');
  if ('response' in auth) return auth.response;
  const body = await parseBody(request, schema);
  if ('response' in body) return body.response;
  try {
    const recorded = await logContacts(body.data.entries as { user_id: string; dedupe_key: string | null }[], body.data.campaign, body.data.channel, body.data.note || null, auth.session.userId ?? null);
    return successResponse({ recorded }, `${recorded} marked`);
  } catch (error) {
    console.error('Error recording outreach:', error);
    return ApiErrors.ServerError('Failed to save');
  }
}
