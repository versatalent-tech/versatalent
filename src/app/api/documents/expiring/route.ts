import { getTeamSession } from '@/lib/middleware/auth';
import { can } from '@/lib/auth/permissions';
import { documentFilter } from '@/lib/documents/access';
import { EXPIRY_WARNING_DAYS } from '@/lib/documents/types';
import { getBookingScope } from '@/lib/db/repositories/bookings';
import { listExpiringDocuments } from '@/lib/db/repositories/documents';
import { ApiErrors, successResponse } from '@/lib/utils/api-response';

export const dynamic = 'force-dynamic';

// GET /api/documents/expiring - talent documents expired, expiring soon, or due for deletion
export async function GET() {
  const session = await getTeamSession();
  if (!session) return ApiErrors.Unauthorized('Please sign in');
  if (!can(session.role, 'bookings.edit')) return successResponse([]);

  try {
    const { includeAdminOnly } = documentFilter(session);
    return successResponse(await listExpiringDocuments(await getBookingScope(session), EXPIRY_WARNING_DAYS, includeAdminOnly));
  } catch (error) {
    console.error('Error listing expiring documents:', error);
    return ApiErrors.ServerError('Failed to load documents');
  }
}
