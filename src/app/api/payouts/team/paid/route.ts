import { NextRequest } from 'next/server';
import { z } from 'zod';
import { requireTeamPermission } from '@/lib/middleware/auth';
import { parseBody } from '@/lib/crm/route-helpers';
import { markStaffSharesPaid } from '@/lib/db/repositories/staff-shares';
import { logAudit } from '@/lib/db/repositories/audit-log';
import { ApiErrors, successResponse } from '@/lib/utils/api-response';

const schema = z.object({
  shares: z
    .array(z.object({ booking_id: z.string().uuid(), user_id: z.string().uuid() }))
    .min(1, 'Choose at least one booking')
    .max(200),
  paid_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use a valid date'),
  reference: z
    .string()
    .trim()
    .max(200)
    .transform((v) => (v === '' ? null : v))
    .nullable()
    .optional(),
});

// POST /api/payouts/team/paid - record that these managers' and road managers' shares have been paid
export async function POST(request: NextRequest) {
  const auth = await requireTeamPermission('payouts.team');
  if ('response' in auth) return auth.response;
  const body = await parseBody(request, schema);
  if ('response' in body) return body.response;

  const paidOn = body.data.paid_on!;
  const today = new Date().toISOString().slice(0, 10);
  if (paidOn > today) return ApiErrors.BadRequest('The payment date can’t be in the future');

  const actor = { userId: auth.session.userId, name: auth.session.name };
  try {
    const shares = body.data.shares!.map((x) => ({ booking_id: x.booking_id!, user_id: x.user_id! }));
    const paid = await markStaffSharesPaid(actor, shares, paidOn, body.data.reference ?? null);
    for (const p of paid) {
      await logAudit(actor, 'staff_share_paid', 'booking', p.booking_id, {
        after: { person: p.person_name, paid_cents: p.paid_cents, currency: p.currency, paid_on: paidOn, reference: body.data.reference ?? null },
      });
    }
    return successResponse(paid, `${paid.length} marked paid`);
  } catch (error) {
    console.error('Error recording team payouts:', error);
    return ApiErrors.ServerError('Failed to record the payments');
  }
}
