import { NextRequest } from 'next/server';
import { z } from 'zod';
import { requireTeamPermission } from '@/lib/middleware/auth';
import { parseBody } from '@/lib/crm/route-helpers';
import { getReferralConfig, listReferrals, updateReferralConfig } from '@/lib/db/repositories/referrals';
import { logAudit } from '@/lib/db/repositories/audit-log';
import type { ReferralStatus } from '@/lib/referrals/types';
import { ApiErrors, successResponse } from '@/lib/utils/api-response';

export const dynamic = 'force-dynamic';

const STATUSES = ['pending', 'review', 'approved', 'rejected', 'all'];

// GET /api/admin/referrals?status=review - settings and referrals
export async function GET(request: NextRequest) {
  const auth = await requireTeamPermission('venue.manage');
  if ('response' in auth) return auth.response;
  const requested = request.nextUrl.searchParams.get('status') ?? 'all';
  const status = (STATUSES.includes(requested) ? requested : 'all') as ReferralStatus | 'all';
  try {
    const [config, referrals] = await Promise.all([getReferralConfig(), listReferrals(status)]);
    return successResponse({ ...config, referrals });
  } catch (error) {
    console.error('Error loading referrals:', error);
    return ApiErrors.ServerError('Failed to load');
  }
}

const schema = z.object({
  open: z.boolean().optional(),
  settings: z
    .object({
      referrer_points: z.number().int().min(0).max(100_000),
      referee_points: z.number().int().min(0).max(100_000),
      min_order_cents: z.number().int().min(0).max(1_000_000),
      yearly_cap: z.number().int().min(0).max(1000),
    })
    .partial()
    .optional(),
});

// PUT /api/admin/referrals - open/close referrals, points, minimum order, yearly limit
export async function PUT(request: NextRequest) {
  const auth = await requireTeamPermission('venue.manage');
  if ('response' in auth) return auth.response;
  const body = await parseBody(request, schema);
  if ('response' in body) return body.response;
  try {
    const before = await getReferralConfig();
    const after = await updateReferralConfig(body.data, auth.session.userId ?? null);
    await logAudit({ userId: auth.session.userId, name: auth.session.name }, 'update', 'referral_settings', null, { before, after });
    return successResponse(after, 'Saved');
  } catch (error) {
    console.error('Error saving referral settings:', error);
    return ApiErrors.ServerError('Failed to save');
  }
}
