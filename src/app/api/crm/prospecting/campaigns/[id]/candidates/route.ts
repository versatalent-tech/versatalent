import { NextRequest } from 'next/server';
import { crmContext } from '@/lib/crm/route-helpers';
import { listCandidates } from '@/lib/db/repositories/prospecting';
import { ApiErrors, successResponse } from '@/lib/utils/api-response';
import { isValidUUID } from '@/lib/utils/validation';

export const dynamic = 'force-dynamic';

// GET /api/crm/prospecting/campaigns/[id]/candidates?q=&orgType=&tag=&city= - contacts to choose from
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await crmContext('crm.view');
  if ('response' in ctx) return ctx.response;
  const { id } = await params;
  if (!isValidUUID(id)) return ApiErrors.NotFound('Campaign');
  const p = request.nextUrl.searchParams;
  const get = (key: string) => p.get(key)?.trim() || undefined;
  try {
    return successResponse(await listCandidates(ctx.scope, id, { q: get('q'), orgType: get('orgType'), tag: get('tag'), city: get('city') }));
  } catch (error) {
    console.error('Error listing candidates:', error);
    return ApiErrors.ServerError('Failed to load contacts');
  }
}
