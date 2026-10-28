import { NextRequest } from 'next/server';
import { listPublicInstagramPosts } from '@/lib/db/repositories/instagram';
import { ApiErrors, successResponse } from '@/lib/utils/api-response';
import { isValidUUID } from '@/lib/utils/validation';

export const dynamic = 'force-dynamic';

const HOMEPAGE_LIMIT = 6;

/**
 * GET /api/instagram/posts?talent=<id>   one talent's featured posts
 * GET /api/instagram/posts?homepage=1    the homepage selection
 * Public: only visible posts of talents on the site.
 */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const talentId = params.get('talent');
  if (!talentId && params.get('homepage') !== '1') return ApiErrors.BadRequest('Choose a talent or the homepage');
  if (talentId && !isValidUUID(talentId)) return ApiErrors.NotFound('Talent');

  try {
    const posts = talentId
      ? await listPublicInstagramPosts({ talentId })
      : await listPublicInstagramPosts({ homepage: true }, HOMEPAGE_LIMIT);
    const response = successResponse(posts);
    // Changes in the admin show up within a few minutes
    response.headers.set('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
    return response;
  } catch (error) {
    console.error('Error loading Instagram posts:', error);
    return ApiErrors.ServerError('Failed to load Instagram posts');
  }
}
