import { NextRequest } from 'next/server';
import { requireTalent } from '@/lib/auth/talent-auth';
import { removeTalentAvailability } from '@/lib/db/repositories/portal';
import { ApiErrors, successResponse } from '@/lib/utils/api-response';
import { isValidUUID } from '@/lib/utils/validation';

// DELETE /api/portal/availability/[id]
export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireTalent();
  if ('response' in auth) return auth.response;
  const { id } = await params;
  if (!isValidUUID(id) || !(await removeTalentAvailability(auth.talent.talentId, id))) return ApiErrors.NotFound('Entry');
  return successResponse(null, 'Removed');
}
