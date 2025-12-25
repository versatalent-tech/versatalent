import { NextRequest } from 'next/server';
import { getAllUsers, getUserByTalentId } from '@/lib/db/repositories/users';
import { successResponse, ApiErrors, logApiError } from '@/lib/utils/api-response';

/**
 * GET /api/users
 * Fetch all users or filter by talent_id
 * Query params:
 * - talentId: Filter by talent ID (optional)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const talentId = searchParams.get('talentId');

    // If talent_id is provided, get user by talent_id
    if (talentId) {
      const user = await getUserByTalentId(talentId);

      // Remove password_hash from response for security
      if (user) {
        const { password_hash, ...sanitizedUser } = user;
        return successResponse([sanitizedUser]);
      }

      return successResponse([]);
    }

    // Otherwise get all users
    const users = await getAllUsers();

    // Remove password_hash from all users for security
    const sanitizedUsers = users.map(({ password_hash, ...user }) => user);

    return successResponse(sanitizedUsers);
  } catch (error) {
    logApiError('/api/users', error, { query: request.nextUrl.search });
    return ApiErrors.ServerError('Failed to fetch users');
  }
}
