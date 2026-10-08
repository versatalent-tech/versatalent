import { NextRequest } from 'next/server';
import { requireTeamPermission } from '@/lib/middleware/auth';
import { parseBody } from '@/lib/crm/route-helpers';
import { perkSchema } from '@/lib/portal/schemas';
import { deletePerk, listAllPerks, toPerkInput, updatePerk } from '@/lib/db/repositories/portal';
import { logAudit } from '@/lib/db/repositories/audit-log';
import { ApiErrors, successResponse } from '@/lib/utils/api-response';
import { isValidUUID } from '@/lib/utils/validation';

type Params = { params: Promise<{ id: string }> };

// PUT /api/admin/talent-portal/perks/[id]
export async function PUT(request: NextRequest, { params }: Params) {
  const auth = await requireTeamPermission('portal.manage');
  if ('response' in auth) return auth.response;
  const { id } = await params;
  if (!isValidUUID(id)) return ApiErrors.NotFound('Perk');
  const body = await parseBody(request, perkSchema);
  if ('response' in body) return body.response;

  if (!(await updatePerk(id, toPerkInput(body.data)))) return ApiErrors.NotFound('Perk');
  await logAudit({ userId: auth.session.userId, name: auth.session.name }, 'update', 'artist_perk', id, { after: body.data });
  return successResponse(await listAllPerks(), 'Perk saved');
}

// DELETE /api/admin/talent-portal/perks/[id]
export async function DELETE(_request: NextRequest, { params }: Params) {
  const auth = await requireTeamPermission('portal.manage');
  if ('response' in auth) return auth.response;
  const { id } = await params;
  if (!isValidUUID(id) || !(await deletePerk(id))) return ApiErrors.NotFound('Perk');
  await logAudit({ userId: auth.session.userId, name: auth.session.name }, 'delete', 'artist_perk', id);
  return successResponse(await listAllPerks(), 'Perk deleted');
}
