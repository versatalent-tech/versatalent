import { NextRequest } from 'next/server';
import { z } from 'zod';
import { bookingContext } from '@/lib/bookings/route-helpers';
import { parseBody } from '@/lib/crm/route-helpers';
import { markPayoutsPaid } from '@/lib/db/repositories/bookings';
import { logAudit } from '@/lib/db/repositories/audit-log';
import { ApiErrors, successResponse } from '@/lib/utils/api-response';

const schema = z.object({
  booking_ids: z.array(z.string().uuid()).min(1, 'Choose at least one booking').max(200),
  paid_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use a valid date'),
  reference: z
    .string()
    .trim()
    .max(200)
    .transform((v) => (v === '' ? null : v))
    .nullable()
    .optional(),
});

// POST /api/payouts/paid - record that the talent has been paid for these bookings
export async function POST(request: NextRequest) {
  const ctx = await bookingContext('payouts.manage');
  if ('response' in ctx) return ctx.response;
  const body = await parseBody(request, schema);
  if ('response' in body) return body.response;

  const paidOn = body.data.paid_on!;
  const today = new Date().toISOString().slice(0, 10);
  if (paidOn > today) return ApiErrors.BadRequest('The payment date can’t be in the future');

  try {
    const paid = await markPayoutsPaid(ctx.scope, ctx.actor, body.data.booking_ids!, paidOn, body.data.reference ?? null);
    for (const p of paid) {
      await logAudit(ctx.actor, 'talent_paid', 'booking', p.id, {
        after: { talent: p.talent_name, paid_cents: p.paid_cents, currency: p.currency, paid_on: paidOn, reference: body.data.reference ?? null },
      });
    }
    const skipped = body.data.booking_ids!.length - paid.length;
    return successResponse(
      { paid, skipped },
      skipped > 0 ? `${paid.length} marked as paid; ${skipped} skipped (already paid, not finished or not yours)` : `${paid.length} marked as paid`
    );
  } catch (error) {
    console.error('Error recording payouts:', error);
    return ApiErrors.ServerError('Failed to record the payment');
  }
}
