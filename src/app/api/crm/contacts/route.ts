import { NextRequest } from 'next/server';
import { crmContext, parseBody } from '@/lib/crm/route-helpers';
import { contactSchema } from '@/lib/crm/schemas';
import { contactEmailTaken, createContact, getContact, getOrganisation, listContacts } from '@/lib/db/repositories/crm';
import { logAudit } from '@/lib/db/repositories/audit-log';
import { ApiErrors, successResponse } from '@/lib/utils/api-response';
import { isValidUUID } from '@/lib/utils/validation';

export const dynamic = 'force-dynamic';

// GET /api/crm/contacts?q=&organisationId=
export async function GET(request: NextRequest) {
  const ctx = await crmContext('crm.view');
  if ('response' in ctx) return ctx.response;
  const organisationId = request.nextUrl.searchParams.get('organisationId');

  try {
    const contacts = await listContacts(ctx.scope, {
      q: request.nextUrl.searchParams.get('q') ?? undefined,
      organisationId: organisationId && isValidUUID(organisationId) ? organisationId : undefined,
    });
    return successResponse(contacts);
  } catch (error) {
    console.error('Error listing contacts:', error);
    return ApiErrors.ServerError('Failed to load contacts');
  }
}

// POST /api/crm/contacts
export async function POST(request: NextRequest) {
  const ctx = await crmContext('crm.edit');
  if ('response' in ctx) return ctx.response;
  const body = await parseBody(request, contactSchema);
  if ('response' in body) return body.response;

  try {
    if (body.data.organisation_id && !(await getOrganisation(ctx.scope, body.data.organisation_id))) {
      return ApiErrors.BadRequest('Client not found');
    }
    if (body.data.email && (await contactEmailTaken(body.data.email))) {
      return ApiErrors.BadRequest('A contact with this email already exists');
    }
    const id = await createContact(ctx.actor, body.data);
    await logAudit(ctx.actor, 'create', 'contact', id, { after: { name: body.data.name } });
    return successResponse(await getContact(ctx.scope, id), 'Contact added', 201);
  } catch (error) {
    console.error('Error creating contact:', error);
    return ApiErrors.ServerError('Failed to add contact');
  }
}
