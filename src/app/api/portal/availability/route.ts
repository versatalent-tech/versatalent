import { NextRequest } from 'next/server';
import { requireTalent } from '@/lib/auth/talent-auth';
import { parseBody } from '@/lib/crm/route-helpers';
import { portalAvailabilitySchema } from '@/lib/portal/schemas';
import { addTalentAvailability, listTalentAvailability } from '@/lib/db/repositories/portal';
import { ApiErrors, successResponse } from '@/lib/utils/api-response';

export const dynamic = 'force-dynamic';

// GET /api/portal/availability - the talent's unavailable days
export async function GET() {
  const auth = await requireTalent();
  if ('response' in auth) return auth.response;
  try {
    return successResponse(await listTalentAvailability(auth.talent.talentId));
  } catch (error) {
    console.error('Portal availability error:', error);
    return ApiErrors.ServerError('Failed to load your availability');
  }
}

// POST /api/portal/availability - add days off
export async function POST(request: NextRequest) {
  const auth = await requireTalent();
  if ('response' in auth) return auth.response;
  const body = await parseBody(request, portalAvailabilitySchema);
  if ('response' in body) return body.response;
  try {
    await addTalentAvailability(auth.talent, {
      starts_on: body.data.starts_on!,
      ends_on: body.data.ends_on!,
      kind: body.data.kind ?? 'unavailable',
      note: body.data.note ?? null,
    });
    return successResponse(await listTalentAvailability(auth.talent.talentId), 'Saved', 201);
  } catch (error) {
    console.error('Portal availability error:', error);
    return ApiErrors.ServerError('Failed to save');
  }
}
