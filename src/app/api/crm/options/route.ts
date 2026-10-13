import { crmContext } from '@/lib/crm/route-helpers';
import { getCrmOptions } from '@/lib/db/repositories/crm';
import { aiNotesEnabled } from '@/lib/meetings/ai-config';
import { ApiErrors, successResponse } from '@/lib/utils/api-response';

export const dynamic = 'force-dynamic';

// GET /api/crm/options - owners and talents for the CRM pickers (talents limited to the person's scope),
// and whether AI meeting notes are switched on
export async function GET() {
  const ctx = await crmContext('crm.view');
  if ('response' in ctx) return ctx.response;
  try {
    return successResponse({ ...(await getCrmOptions(ctx.scope)), me: ctx.scope.userId, canDelete: ctx.session.role === 'admin', aiNotes: aiNotesEnabled() });
  } catch (error) {
    console.error('Error loading CRM options:', error);
    return ApiErrors.ServerError('Failed to load options');
  }
}
