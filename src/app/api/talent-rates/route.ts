import { NextRequest } from 'next/server';
import { requireTeamPermission } from '@/lib/middleware/auth';
import { ratesSchema } from '@/lib/bookings/schemas';
import { parseBody } from '@/lib/crm/route-helpers';
import { listTalentRates, setTalentRates } from '@/lib/db/repositories/bookings';
import { logAudit } from '@/lib/db/repositories/audit-log';
import { ApiErrors, successResponse } from '@/lib/utils/api-response';

export const dynamic = 'force-dynamic';

// GET /api/talent-rates - each talent's commission rate (admins only)
export async function GET() {
  const auth = await requireTeamPermission('rates.manage');
  if ('response' in auth) return auth.response;
  try {
    return successResponse(await listTalentRates());
  } catch (error) {
    console.error('Error loading rates:', error);
    return ApiErrors.ServerError('Failed to load rates');
  }
}

// PUT /api/talent-rates - set rates; existing bookings keep the rate they were made with
export async function PUT(request: NextRequest) {
  const auth = await requireTeamPermission('rates.manage');
  if ('response' in auth) return auth.response;
  const body = await parseBody(request, ratesSchema);
  if ('response' in body) return body.response;

  try {
    const before = await listTalentRates();
    await setTalentRates(body.data.rates.map((r) => ({ talent_id: r.talent_id!, commission_percent: r.commission_percent ?? null })));
    const changed = body.data.rates.filter(
      (r) => before.find((b) => b.id === r.talent_id)?.commission_percent !== r.commission_percent
    );
    if (changed.length > 0) {
      await logAudit({ userId: auth.session.userId, name: auth.session.name }, 'update', 'talent_rates', null, {
        before: Object.fromEntries(changed.map((r) => [r.talent_id, before.find((b) => b.id === r.talent_id)?.commission_percent ?? null])),
        after: Object.fromEntries(changed.map((r) => [r.talent_id, r.commission_percent])),
      });
    }
    return successResponse(await listTalentRates(), 'Rates saved');
  } catch (error) {
    console.error('Error saving rates:', error);
    return ApiErrors.ServerError('Failed to save rates');
  }
}
