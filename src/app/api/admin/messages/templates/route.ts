import { NextRequest } from 'next/server';
import { requireTeamPermission } from '@/lib/middleware/auth';
import { parseBody } from '@/lib/crm/route-helpers';
import { createTemplate, listTemplates } from '@/lib/db/repositories/customer-messages';
import { logAudit } from '@/lib/db/repositories/audit-log';
import { templateSchema } from '@/lib/messages/schemas';
import { ApiErrors, successResponse } from '@/lib/utils/api-response';

export const dynamic = 'force-dynamic';

// GET /api/admin/messages/templates - the template library (default texts added the first time)
export async function GET() {
  const auth = await requireTeamPermission('venue.manage');
  if ('response' in auth) return auth.response;
  try {
    return successResponse(await listTemplates());
  } catch (error) {
    console.error('Error loading message templates:', error);
    return ApiErrors.ServerError('Failed to load. Has migration 046 been run?');
  }
}

// POST /api/admin/messages/templates - add a template
export async function POST(request: NextRequest) {
  const auth = await requireTeamPermission('venue.manage');
  if ('response' in auth) return auth.response;
  const body = await parseBody(request, templateSchema);
  if ('response' in body) return body.response;
  try {
    const template = await createTemplate(body.data, auth.session.userId ?? null);
    await logAudit({ userId: auth.session.userId, name: auth.session.name }, 'create', 'message_template', template.id, { after: body.data });
    return successResponse(template, 'Saved', 201);
  } catch (error) {
    console.error('Error saving message template:', error);
    return ApiErrors.ServerError('Failed to save');
  }
}
