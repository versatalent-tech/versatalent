import { NextRequest } from 'next/server';
import { requireTeamPermission } from '@/lib/middleware/auth';
import { parseBody } from '@/lib/crm/route-helpers';
import { perkSchema } from '@/lib/portal/schemas';
import { createPerk, listAllPerks, toPerkInput } from '@/lib/db/repositories/portal';
import { logAudit } from '@/lib/db/repositories/audit-log';
import { ApiErrors, successResponse } from '@/lib/utils/api-response';

export const dynamic = 'force-dynamic';

// GET /api/admin/talent-portal/perks
export async function GET() {
  const auth = await requireTeamPermission('portal.manage');
  if ('response' in auth) return auth.response;
  try {
    return successResponse(await listAllPerks());
  } catch (error) {
    console.error('Error listing perks:', error);
    return ApiErrors.ServerError('Failed to load perks');
  }
}

// POST /api/admin/talent-portal/perks
export async function POST(request: NextRequest) {
  const auth = await requireTeamPermission('portal.manage');
  if ('response' in auth) return auth.response;
  const body = await parseBody(request, perkSchema);
  if ('response' in body) return body.response;
  try {
    const id = await createPerk(toPerkInput(body.data));
    await logAudit({ userId: auth.session.userId, name: auth.session.name }, 'create', 'artist_perk', id, { after: body.data });
    return successResponse(await listAllPerks(), 'Perk added', 201);
  } catch (error) {
    console.error('Error creating perk:', error);
    return ApiErrors.ServerError('Failed to add perk');
  }
}
