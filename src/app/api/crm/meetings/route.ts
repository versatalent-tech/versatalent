import { NextRequest } from 'next/server';
import { crmContext, parseBody } from '@/lib/crm/route-helpers';
import { meetingSchema } from '@/lib/crm/schemas';
import { checkMeetingLinks } from '@/lib/meetings/links';
import { createMeeting, getMeeting, listMeetings } from '@/lib/db/repositories/meetings';
import { logAudit } from '@/lib/db/repositories/audit-log';
import { ApiErrors, successResponse } from '@/lib/utils/api-response';
import { isValidUUID } from '@/lib/utils/validation';

export const dynamic = 'force-dynamic';

// GET /api/crm/meetings?dealId=&organisationId= - meetings the person can see, newest first
export async function GET(request: NextRequest) {
  const ctx = await crmContext('crm.view');
  if ('response' in ctx) return ctx.response;
  const params = request.nextUrl.searchParams;
  const dealId = params.get('dealId');
  const organisationId = params.get('organisationId');

  try {
    const meetings = await listMeetings(ctx.scope, {
      dealId: dealId && isValidUUID(dealId) ? dealId : undefined,
      organisationId: organisationId && isValidUUID(organisationId) ? organisationId : undefined,
    });
    return successResponse(meetings);
  } catch (error) {
    console.error('Error listing meetings:', error);
    return ApiErrors.ServerError('Failed to load meetings');
  }
}

// POST /api/crm/meetings - schedule a meeting, or log one afterwards
export async function POST(request: NextRequest) {
  const ctx = await crmContext('crm.edit');
  if ('response' in ctx) return ctx.response;
  const body = await parseBody(request, meetingSchema);
  if ('response' in body) return body.response;

  try {
    const problem = await checkMeetingLinks(ctx.scope, body.data);
    if (problem) return ApiErrors.BadRequest(problem);

    const id = await createMeeting(ctx.actor, body.data);
    await logAudit(ctx.actor, 'create', 'meeting', id, { after: { title: body.data.title, starts_at: body.data.starts_at } });
    return successResponse(await getMeeting(ctx.scope, id), 'Meeting saved', 201);
  } catch (error) {
    console.error('Error creating meeting:', error);
    return ApiErrors.ServerError('Failed to save the meeting');
  }
}
