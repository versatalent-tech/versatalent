import { NextRequest } from 'next/server';
import { requireTeamPermission } from '@/lib/middleware/auth';
import { parseBody } from '@/lib/crm/route-helpers';
import { inPersonSaleSchema } from '@/lib/membership/schemas';
import { findMemberForSale, getFoundingSettings, getPaidMembership, recordInPersonPurchase } from '@/lib/db/repositories/founding';
import { getProgrammeSettings } from '@/lib/db/repositories/membership';
import { logAudit } from '@/lib/db/repositories/audit-log';
import { ApiErrors, successResponse } from '@/lib/utils/api-response';

/**
 * POST /api/admin/founding/sales - record a Founding Membership paid in
 * person (card reader, SumUp app or cash) for an existing member, found by
 * email or card UID. Works while online sales are paused.
 */
export async function POST(request: NextRequest) {
  const auth = await requireTeamPermission('venue.manage');
  if ('response' in auth) return auth.response;
  const body = await parseBody(request, inPersonSaleSchema);
  if ('response' in body) return body.response;
  const input = body.data;

  try {
    const member = await findMemberForSale(input.email ? { email: input.email } : { card_uid: input.card_uid });
    if (!member) return ApiErrors.BadRequest('No member found. They need to join first (online or on the Membership cards page).');

    const [settings, programme] = await Promise.all([getFoundingSettings(), getProgrammeSettings()]);
    const result = await recordInPersonPurchase(
      member.id,
      { method: input.method, reference: input.reference, priceCents: input.price_cents },
      settings,
      programme.terms_version,
      auth.session.userId ?? null
    );
    if ('error' in result) return ApiErrors.BadRequest(result.error);

    const membership = await getPaidMembership(result.membershipId);
    await logAudit({ userId: auth.session.userId, name: auth.session.name }, 'in_person_sale', 'paid_membership', result.membershipId, {
      after: { member: member.email, method: input.method, reference: input.reference, price_cents: input.price_cents },
    });
    return successResponse(membership, `${member.name} is Founding Member No. ${membership?.founding_number ?? '?'}`);
  } catch (error) {
    console.error('Error recording in-person Founding sale:', error);
    return ApiErrors.ServerError('Failed to record the sale');
  }
}
