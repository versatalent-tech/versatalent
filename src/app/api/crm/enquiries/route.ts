import { NextRequest } from 'next/server';
import { crmContext } from '@/lib/crm/route-helpers';
import { countEnquiries, listEnquiries } from '@/lib/db/repositories/crm';
import { ApiErrors, successResponse } from '@/lib/utils/api-response';

export const dynamic = 'force-dynamic';

const STATUSES = ['new', 'converted', 'archived', 'spam', 'all'] as const;

// GET /api/crm/enquiries?status=new - website enquiries inbox
export async function GET(request: NextRequest) {
  const ctx = await crmContext('enquiries.view');
  if ('response' in ctx) return ctx.response;
  const requested = request.nextUrl.searchParams.get('status') ?? 'new';
  const status = (STATUSES as readonly string[]).includes(requested) ? (requested as (typeof STATUSES)[number]) : 'new';

  try {
    const [enquiries, counts] = await Promise.all([listEnquiries(status), countEnquiries()]);
    return successResponse({ enquiries, counts });
  } catch (error) {
    console.error('Error listing enquiries:', error);
    return ApiErrors.ServerError('Failed to load enquiries');
  }
}
