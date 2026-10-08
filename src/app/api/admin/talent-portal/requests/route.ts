import { NextRequest } from 'next/server';
import { requireTeamPermission } from '@/lib/middleware/auth';
import { listProfileChanges } from '@/lib/db/repositories/portal';
import { ApiErrors, successResponse } from '@/lib/utils/api-response';

export const dynamic = 'force-dynamic';

// GET /api/admin/talent-portal/requests?status=pending|all - talents' profile change requests
export async function GET(request: NextRequest) {
  const auth = await requireTeamPermission('portal.manage');
  if ('response' in auth) return auth.response;
  const status = request.nextUrl.searchParams.get('status') === 'all' ? 'all' : 'pending';
  try {
    return successResponse(await listProfileChanges(status));
  } catch (error) {
    console.error('Error listing profile requests:', error);
    return ApiErrors.ServerError('Failed to load requests');
  }
}
