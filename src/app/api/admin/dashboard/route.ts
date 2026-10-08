import { NextRequest } from 'next/server';
import { withAdminAuth } from '@/lib/middleware/auth';
import { getDashboardSummary } from '@/lib/db/repositories/dashboard';
import { errorResponse, successResponse } from '@/lib/utils/api-response';

export const dynamic = 'force-dynamic';

// GET /api/admin/dashboard - live figures for the admin home page
export const GET = withAdminAuth(async (_request: NextRequest) => {
  try {
    const summary = await getDashboardSummary();
    const response = successResponse(summary);
    response.headers.set('Cache-Control', 'private, no-store');
    return response;
  } catch (error) {
    console.error('Error building admin dashboard:', error);
    return errorResponse('Failed to load dashboard figures', 500);
  }
});
