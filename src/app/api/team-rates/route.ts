import { NextRequest } from 'next/server';
import { requireTeamPermission } from '@/lib/middleware/auth';
import { teamRatesSchema } from '@/lib/bookings/schemas';
import { parseBody } from '@/lib/crm/route-helpers';
import { listTeamRates, setTeamRates } from '@/lib/db/repositories/staff-shares';
import { logAudit } from '@/lib/db/repositories/audit-log';
import { ApiErrors, successResponse } from '@/lib/utils/api-response';

export const dynamic = 'force-dynamic';

// GET /api/team-rates - managers' and road managers' share of the agency's commission (admins only)
export async function GET() {
  const auth = await requireTeamPermission('rates.manage');
  if ('response' in auth) return auth.response;
  try {
    return successResponse(await listTeamRates());
  } catch (error) {
    console.error('Error loading team rates:', error);
    return ApiErrors.ServerError('Failed to load team rates');
  }
}

// PUT /api/team-rates - set rates; existing bookings keep the share they were made with
export async function PUT(request: NextRequest) {
  const auth = await requireTeamPermission('rates.manage');
  if ('response' in auth) return auth.response;
  const body = await parseBody(request, teamRatesSchema);
  if ('response' in body) return body.response;

  try {
    const before = (await listTeamRates()).people;
    const rates = body.data.rates.map((r) => ({ user_id: r.user_id!, share_percent: r.share_percent ?? null }));
    const firstSet = await setTeamRates(rates);
    const changed = rates.filter((r) => {
      const person = before.find((b) => b.id === r.user_id);
      return person && person.share_percent !== r.share_percent;
    });
    if (changed.length > 0) {
      await logAudit({ userId: auth.session.userId, name: auth.session.name }, 'update', 'team_rates', null, {
        before: Object.fromEntries(changed.map((r) => [r.user_id, before.find((b) => b.id === r.user_id)?.share_percent ?? null])),
        after: {
          ...Object.fromEntries(changed.map((r) => [r.user_id, r.share_percent])),
          // first rate: shares were added to their talents' bookings not yet paid to the talent
          ...(firstSet.length > 0 ? { first_set: firstSet } : {}),
        },
      });
    }
    return successResponse(await listTeamRates(), 'Team rates saved');
  } catch (error) {
    console.error('Error saving team rates:', error);
    return ApiErrors.ServerError('Failed to save team rates');
  }
}
