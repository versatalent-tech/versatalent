import { NextRequest } from 'next/server';
import { requireTeamPermission } from '@/lib/middleware/auth';
import { parseBody } from '@/lib/crm/route-helpers';
import { updatePostSchema } from '@/lib/instagram/schemas';
import {
  deleteInstagramPost,
  getInstagramPost,
  listInstagramPosts,
  moveInstagramPost,
  updateInstagramPost,
} from '@/lib/db/repositories/instagram';
import { getTalentById } from '@/lib/db/repositories/talents';
import { logAudit } from '@/lib/db/repositories/audit-log';
import { ApiErrors, successResponse } from '@/lib/utils/api-response';
import { isValidUUID } from '@/lib/utils/validation';

type Params = { params: Promise<{ id: string }> };

// PATCH /api/admin/instagram/posts/[id] { talent_id?, on_homepage?, is_visible?, move? }
export async function PATCH(request: NextRequest, { params }: Params) {
  const auth = await requireTeamPermission('venue.manage');
  if ('response' in auth) return auth.response;
  const { id } = await params;
  if (!isValidUUID(id)) return ApiErrors.NotFound('Post');
  const body = await parseBody(request, updatePostSchema);
  if ('response' in body) return body.response;
  const { move, ...changes } = body.data;

  try {
    const before = await getInstagramPost(id);
    if (!before) return ApiErrors.NotFound('Post');
    if (changes.talent_id && !(await getTalentById(changes.talent_id))) return ApiErrors.NotFound('Talent');

    if (Object.values(changes).some((v) => v !== undefined)) await updateInstagramPost(id, changes);
    if (move) await moveInstagramPost(id, move);

    await logAudit({ userId: auth.session.userId, name: auth.session.name }, 'update', 'instagram_post', id, {
      before: { talent_id: before.talent?.id ?? null, on_homepage: before.on_homepage, is_visible: before.is_visible },
      after: body.data,
    });
    return successResponse(await listInstagramPosts(), 'Saved');
  } catch (error) {
    console.error('Error updating Instagram post:', error);
    return ApiErrors.ServerError('Failed to save');
  }
}

// DELETE /api/admin/instagram/posts/[id] - take a post off the website
export async function DELETE(_request: NextRequest, { params }: Params) {
  const auth = await requireTeamPermission('venue.manage');
  if ('response' in auth) return auth.response;
  const { id } = await params;
  if (!isValidUUID(id)) return ApiErrors.NotFound('Post');

  try {
    const before = await getInstagramPost(id);
    if (!before || !(await deleteInstagramPost(id))) return ApiErrors.NotFound('Post');
    await logAudit({ userId: auth.session.userId, name: auth.session.name }, 'delete', 'instagram_post', id, {
      before: { kind: before.kind, shortcode: before.shortcode, talent_id: before.talent?.id ?? null },
    });
    return successResponse(await listInstagramPosts(), 'Post removed');
  } catch (error) {
    console.error('Error removing Instagram post:', error);
    return ApiErrors.ServerError('Failed to remove the post');
  }
}
