import { crmContext } from '@/lib/crm/route-helpers';
import { getCrmOptions } from '@/lib/db/repositories/crm';
import { ApiErrors, successResponse } from '@/lib/utils/api-response';

export const dynamic = 'force-dynamic';

// GET /api/crm/options - owners and talents for the CRM pickers (talents limited to the person's scope)
export async function GET() {
  const ctx = await crmContext('crm.view');
  if ('response' in ctx) return ctx.response;
  try {
    return successResponse({ ...(await getCrmOptions(ctx.scope)), me: ctx.scope.userId, canDelete: ctx.session.role === 'admin' });
  } catch (error) {
    console.error('Error loading CRM options:', error);
    return ApiErrors.ServerError('Failed to load options');
  }
}
