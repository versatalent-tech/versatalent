import { NextRequest } from 'next/server';
import { z } from 'zod';
import { requireTeamPermission } from '@/lib/middleware/auth';
import { parseBody } from '@/lib/crm/route-helpers';
import {
  getFoundingSettings,
  getFoundingStats,
  listPaidMemberships,
  updateFoundingSettings,
  type MembershipFilter,
} from '@/lib/db/repositories/founding';
import { getProgrammeSettings } from '@/lib/db/repositories/membership';
import { logAudit } from '@/lib/db/repositories/audit-log';
import { ApiErrors, successResponse } from '@/lib/utils/api-response';

export const dynamic = 'force-dynamic';

const FILTERS: MembershipFilter[] = ['current', 'expiring', 'pending', 'ended', 'refund', 'all'];

// GET /api/admin/founding?filter=current - settings, headline numbers and purchases
export async function GET(request: NextRequest) {
  const auth = await requireTeamPermission('venue.manage');
  if ('response' in auth) return auth.response;
  const requested = request.nextUrl.searchParams.get('filter') as MembershipFilter;
  const filter = FILTERS.includes(requested) ? requested : 'current';

  try {
    const [settings, programme] = await Promise.all([getFoundingSettings(), getProgrammeSettings()]);
    const [stats, memberships] = await Promise.all([getFoundingStats(settings), listPaidMemberships(filter)]);
    return successResponse({ settings, terms_version: programme.terms_version, stats, memberships });
  } catch (error) {
    console.error('Error loading Founding Memberships:', error);
    return ApiErrors.ServerError('Failed to load');
  }
}

const settingsSchema = z.object({
  founding_on_sale: z.boolean().optional(),
  founding_price_cents: z.number().int().min(100).max(100_000).optional(),
  founding_cap: z.number().int().min(1).max(100_000).optional(),
});

// PUT /api/admin/founding - put on sale or pause, price, number of founding places
export async function PUT(request: NextRequest) {
  const auth = await requireTeamPermission('venue.manage');
  if ('response' in auth) return auth.response;
  const body = await parseBody(request, settingsSchema);
  if ('response' in body) return body.response;

  try {
    const before = await getFoundingSettings();
    const after = await updateFoundingSettings(body.data, auth.session.userId ?? null);
    await logAudit({ userId: auth.session.userId, name: auth.session.name }, 'update', 'founding_settings', null, { before, after });
    return successResponse(after, 'Saved');
  } catch (error) {
    console.error('Error saving Founding settings:', error);
    return ApiErrors.ServerError('Failed to save');
  }
}
