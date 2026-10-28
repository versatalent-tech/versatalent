import { NextRequest } from 'next/server';
import { requireTeamPermission } from '@/lib/middleware/auth';
import { parseBody } from '@/lib/crm/route-helpers';
import { addPostSchema } from '@/lib/instagram/schemas';
import { instagramPermalink, parseInstagramUrl } from '@/lib/instagram/links';
import { checkInstagramPost } from '@/lib/instagram/check';
import { createInstagramPost, listInstagramPosts } from '@/lib/db/repositories/instagram';
import { getTalentById } from '@/lib/db/repositories/talents';
import { logAudit } from '@/lib/db/repositories/audit-log';
import { ApiErrors, errorResponse, successResponse } from '@/lib/utils/api-response';

export const dynamic = 'force-dynamic';

// GET /api/admin/instagram/posts - every featured post
export async function GET() {
  const auth = await requireTeamPermission('venue.manage');
  if ('response' in auth) return auth.response;
  try {
    return successResponse(await listInstagramPosts());
  } catch (error) {
    console.error('Error listing Instagram posts:', error);
    return ApiErrors.ServerError('Failed to load Instagram posts');
  }
}

// POST /api/admin/instagram/posts { url, talent_id, on_homepage } - feature a post
export async function POST(request: NextRequest) {
  const auth = await requireTeamPermission('venue.manage');
  if ('response' in auth) return auth.response;
  const body = await parseBody(request, addPostSchema);
  if ('response' in body) return body.response;

  const ref = parseInstagramUrl(body.data.url);
  if (!ref) return ApiErrors.BadRequest('That isn’t a link to an Instagram post or reel');

  try {
    if (body.data.talent_id && !(await getTalentById(body.data.talent_id))) return ApiErrors.NotFound('Talent');

    const check = await checkInstagramPost(instagramPermalink(ref));
    if (check === 'unavailable') {
      return ApiErrors.BadRequest('Instagram can’t show that post: it may be private, deleted, or from a private account');
    }

    const id = await createInstagramPost({
      ...ref,
      talentId: body.data.talent_id,
      onHomepage: body.data.on_homepage,
      addedBy: auth.session.userId ?? null,
    });
    if (!id) return errorResponse('That post is already on the website', 409, undefined, 'CONFLICT');

    await logAudit({ userId: auth.session.userId, name: auth.session.name }, 'create', 'instagram_post', id, {
      after: { ...ref, talent_id: body.data.talent_id, on_homepage: body.data.on_homepage },
    });
    const message =
      check === 'unknown' ? 'Post added. Instagram didn’t confirm it right now, so check it shows on the site.' : 'Post added';
    return successResponse(await listInstagramPosts(), message, 201);
  } catch (error) {
    console.error('Error adding Instagram post:', error);
    return ApiErrors.ServerError('Failed to add the post');
  }
}
