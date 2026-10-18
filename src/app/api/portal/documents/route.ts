import { requireTalent } from '@/lib/auth/talent-auth';
import { listSharedTalentDocuments } from '@/lib/db/repositories/documents';
import { ApiErrors, successResponse } from '@/lib/utils/api-response';

export const dynamic = 'force-dynamic';

// GET /api/portal/documents - documents on the talent's profile that the team shared with them
export async function GET() {
  const auth = await requireTalent();
  if ('response' in auth) return auth.response;
  try {
    return successResponse(await listSharedTalentDocuments(auth.talent.talentId));
  } catch (error) {
    console.error('Portal documents error:', error);
    return ApiErrors.ServerError('Failed to load your documents');
  }
}
