import { requireTeamPermission } from '@/lib/middleware/auth';
import { getDashboardSummary, getScopedDashboardSummary } from '@/lib/db/repositories/dashboard';
import { getTalentScope } from '@/lib/db/repositories/team';
import { errorResponse, successResponse } from '@/lib/utils/api-response';

export const dynamic = 'force-dynamic';

// GET /api/admin/dashboard - figures for the admin home page, shaped by role
export async function GET() {
  const auth = await requireTeamPermission('dashboard.view');
  if ('response' in auth) return auth.response;

  const { session } = auth;
  const viewer = { name: session.name ?? null, role: session.role };

  try {
    const scope = await getTalentScope(session);
    const data =
      scope === 'all'
        ? { view: 'full' as const, viewer, ...(await getDashboardSummary()) }
        : { view: 'scoped' as const, viewer, ...(await getScopedDashboardSummary(scope)) };

    const response = successResponse(data);
    response.headers.set('Cache-Control', 'private, no-store');
    return response;
  } catch (error) {
    console.error('Error building admin dashboard:', error);
    return errorResponse('Failed to load dashboard figures', 500);
  }
}
