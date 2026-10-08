import { bookingContext } from '@/lib/bookings/route-helpers';
import { can } from '@/lib/auth/permissions';
import { sql } from '@/lib/db/client';
import { getCrmScope, listDeals, listOrganisations } from '@/lib/db/repositories/crm';
import { ApiErrors, successResponse } from '@/lib/utils/api-response';

export const dynamic = 'force-dynamic';

// GET /api/bookings/options - what this person can do on the calendar, and what they can pick
export async function GET() {
  const ctx = await bookingContext('bookings.view');
  if ('response' in ctx) return ctx.response;
  const role = ctx.session.role;

  try {
    const talentRows = ctx.scope.all
      ? await sql`SELECT id, name, commission_percent FROM talents ORDER BY is_active DESC, name`
      : await sql`SELECT id, name, commission_percent FROM talents WHERE id = ANY(${ctx.scope.talentIds}::uuid[]) ORDER BY name`;

    // Deals and clients to link a booking to (only for people who use the CRM)
    let deals: { id: string; name: string; organisation_id: string | null; talent_ids: string[]; value_cents: number | null }[] = [];
    let clients: { id: string; name: string }[] = [];
    if (can(role, 'crm.view')) {
      const crm = await getCrmScope(ctx.session);
      const [dealList, orgList] = await Promise.all([listDeals(crm), listOrganisations(crm)]);
      deals = dealList
        .filter((d) => d.stage !== 'lost')
        .map((d) => ({
          id: d.id,
          name: d.title,
          organisation_id: d.organisation?.id ?? null,
          talent_ids: d.talents.map((t) => t.id),
          value_cents: ctx.withMoney ? d.value_cents : null,
        }));
      clients = orgList.map((o) => ({ id: o.id, name: o.name }));
    }

    return successResponse({
      talents: talentRows.map((t: any) => ({
        id: t.id,
        name: t.name,
        commission_percent: ctx.withMoney && t.commission_percent !== null ? Number(t.commission_percent) : null,
      })),
      deals,
      clients,
      can: {
        edit: can(role, 'bookings.edit'),
        fees: ctx.withMoney,
        clientVisibility: can(role, 'bookings.client_visibility'),
        logistics: can(role, 'bookings.logistics'),
        availability: can(role, 'availability.edit'),
        rates: can(role, 'rates.manage'),
        delete: can(role, 'crm.delete'),
      },
      hasPersonalAccount: Boolean(ctx.session.userId),
    });
  } catch (error) {
    console.error('Error loading booking options:', error);
    return ApiErrors.ServerError('Failed to load options');
  }
}
