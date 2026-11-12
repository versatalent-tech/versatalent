import { NextRequest } from 'next/server';
import { requireTeamPermission } from '@/lib/middleware/auth';
import { parseBody } from '@/lib/crm/route-helpers';
import { deleteTemplate, updateTemplate } from '@/lib/db/repositories/customer-messages';
import { logAudit } from '@/lib/db/repositories/audit-log';
import { templateSchema } from '@/lib/messages/schemas';
import { ApiErrors, successResponse } from '@/lib/utils/api-response';
import { isValidUUID } from '@/lib/utils/validation';

export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ id: string }> };

// PUT /api/admin/messages/templates/[id] - edit a template (or make it the stage's default)
export async function PUT(request: NextRequest, { params }: Params) {
  const auth = await requireTeamPermission('venue.manage');
  if ('response' in auth) return auth.response;
  const { id } = await params;
  if (!isValidUUID(id)) return ApiErrors.NotFound('Template');
  const body = await parseBody(request, templateSchema);
  if ('response' in body) return body.response;
  try {
    const template = await updateTemplate(id, body.data, auth.session.userId ?? null);
    if (!template) return ApiErrors.NotFound('Template');
    await logAudit({ userId: auth.session.userId, name: auth.session.name }, 'update', 'message_template', id, { after: body.data });
    return successResponse(template, 'Saved');
  } catch (error) {
    console.error('Error saving message template:', error);
    return ApiErrors.ServerError('Failed to save');
  }
}

// DELETE /api/admin/messages/templates/[id]
export async function DELETE(_request: NextRequest, { params }: Params) {
  const auth = await requireTeamPermission('venue.manage');
  if ('response' in auth) return auth.response;
  const { id } = await params;
  if (!isValidUUID(id)) return ApiErrors.NotFound('Template');
  try {
    if (!(await deleteTemplate(id))) return ApiErrors.NotFound('Template');
    await logAudit({ userId: auth.session.userId, name: auth.session.name }, 'delete', 'message_template', id);
    return successResponse({ id }, 'Deleted');
  } catch (error) {
    console.error('Error deleting message template:', error);
    return ApiErrors.ServerError('Failed to delete');
  }
}
