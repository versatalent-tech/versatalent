import { NextRequest } from 'next/server';
import { z } from 'zod';
import { requireTeamPermission } from '@/lib/middleware/auth';
import { parseBody } from '@/lib/crm/route-helpers';
import { getProgrammeSettings, updateProgrammeSettings } from '@/lib/db/repositories/membership';
import { logAudit } from '@/lib/db/repositories/audit-log';
import { ApiErrors, successResponse } from '@/lib/utils/api-response';

export const dynamic = 'force-dynamic';

const schema = z.object({
  signup_open: z.boolean().optional(),
  card_delivery_fee_cents: z.number().int().min(0).max(5000).optional(),
  terms_version: z.string().trim().min(1).max(40).optional(),
});

// GET /api/admin/membership-settings
export async function GET() {
  const auth = await requireTeamPermission('venue.manage');
  if ('response' in auth) return auth.response;
  return successResponse(await getProgrammeSettings());
}

// PUT /api/admin/membership-settings - open/close sign-ups, card fee, terms version
export async function PUT(request: NextRequest) {
  const auth = await requireTeamPermission('venue.manage');
  if ('response' in auth) return auth.response;
  const body = await parseBody(request, schema);
  if ('response' in body) return body.response;

  try {
    const before = await getProgrammeSettings();
    const after = await updateProgrammeSettings(body.data, auth.session.userId ?? null);
    await logAudit({ userId: auth.session.userId, name: auth.session.name }, 'update', 'programme_settings', null, { before, after });
    return successResponse(after, 'Saved');
  } catch (error) {
    console.error('Error saving membership settings:', error);
    return ApiErrors.ServerError('Failed to save');
  }
}
