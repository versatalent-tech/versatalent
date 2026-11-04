import { NextRequest } from 'next/server';
import { z } from 'zod';
import { closeClaim, getClaim } from '@/lib/db/repositories/loyalty';
import { ApiErrors, successResponse } from '@/lib/utils/api-response';
import { isValidUUID } from '@/lib/utils/validation';

const schema = z.object({ member: z.string().uuid() });

// POST /api/rewards/claims/[id]/cancel { member } - a member withdraws a request (no points were taken).
// Claims with points held are cancelled by staff.
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const parsed = schema.safeParse(await request.json().catch(() => undefined));
  if (!isValidUUID(id) || !parsed.success) return ApiErrors.NotFound('Claim');

  try {
    const claim = await getClaim(id);
    if (!claim || claim.member.id !== parsed.data.member) return ApiErrors.NotFound('Claim');
    if (claim.status !== 'requested') return ApiErrors.BadRequest('Ask a member of staff to cancel this.');
    const result = await closeClaim(id, 'cancelled', null, 'Cancelled by the member');
    if ('error' in result) return ApiErrors.BadRequest(result.error);
    const after = await getClaim(id);
    return successResponse(after ? { ...after, code: '' } : null, 'Cancelled');
  } catch (error) {
    console.error('Claim cancel error:', error);
    return ApiErrors.ServerError('Couldn’t cancel the claim');
  }
}
