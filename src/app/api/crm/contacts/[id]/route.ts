import { NextRequest } from 'next/server';
import { crmContext, parseBody } from '@/lib/crm/route-helpers';
import { contactSchema } from '@/lib/crm/schemas';
import { contactEmailTaken, deleteContact, getContact, getOrganisation, updateContact } from '@/lib/db/repositories/crm';
import { logAudit } from '@/lib/db/repositories/audit-log';
import { can } from '@/lib/auth/permissions';
import { ApiErrors, successResponse } from '@/lib/utils/api-response';
import { isValidUUID } from '@/lib/utils/validation';

type Params = { params: Promise<{ id: string }> };

// PATCH /api/crm/contacts/[id]
export async function PATCH(request: NextRequest, { params }: Params) {
  const ctx = await crmContext('crm.edit');
  if ('response' in ctx) return ctx.response;
  const { id } = await params;
  if (!isValidUUID(id)) return ApiErrors.NotFound('Contact');
  const body = await parseBody(request, contactSchema.partial());
  if ('response' in body) return body.response;

  try {
    if (body.data.organisation_id && !(await getOrganisation(ctx.scope, body.data.organisation_id))) {
      return ApiErrors.BadRequest('Client not found');
    }
    if (body.data.email && (await contactEmailTaken(body.data.email, id))) {
      return ApiErrors.BadRequest('A contact with this email already exists');
    }
    if (!(await updateContact(ctx.scope, id, body.data))) return ApiErrors.NotFound('Contact');
    await logAudit(ctx.actor, 'update', 'contact', id, { after: body.data });
    return successResponse(await getContact(ctx.scope, id), 'Contact updated');
  } catch (error) {
    console.error('Error updating contact:', error);
    return ApiErrors.ServerError('Failed to update contact');
  }
}

// DELETE /api/crm/contacts/[id] - admins only
export async function DELETE(_request: NextRequest, { params }: Params) {
  const ctx = await crmContext('crm.edit');
  if ('response' in ctx) return ctx.response;
  if (!can(ctx.session.role, 'crm.delete')) return ApiErrors.Forbidden('Only admins can delete contacts');
  const { id } = await params;
  if (!isValidUUID(id)) return ApiErrors.NotFound('Contact');

  try {
    const contact = await getContact(ctx.scope, id);
    if (!contact) return ApiErrors.NotFound('Contact');
    await deleteContact(id);
    await logAudit(ctx.actor, 'delete', 'contact', id, { before: { name: contact.name, email: contact.email } });
    return successResponse(null, 'Contact deleted');
  } catch (error) {
    console.error('Error deleting contact:', error);
    return ApiErrors.ServerError('Failed to delete contact');
  }
}
