import { NextRequest } from 'next/server';
import { crmContext } from '@/lib/crm/route-helpers';
import { listDue } from '@/lib/db/repositories/prospecting';
import { ApiErrors, successResponse } from '@/lib/utils/api-response';

export const dynamic = 'force-dynamic';

// GET /api/crm/prospecting/due?who=me|all - steps due by the end of today
export async function GET(request: NextRequest) {
  const ctx = await crmContext('crm.view');
  if ('response' in ctx) return ctx.response;
  const who = request.nextUrl.searchParams.get('who') === 'all' ? null : ctx.scope.userId;
  try {
    return successResponse(await listDue(ctx.scope, who));
  } catch (error) {
    console.error('Error listing due steps:', error);
    return ApiErrors.ServerError('Failed to load what is due');
  }
}
