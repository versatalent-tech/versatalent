import { NextRequest } from 'next/server';
import { z } from 'zod';
import { closeClaim, getClaim } from '@/lib/db/repositories/loyalty';
import { ApiErrors, successResponse } from '@/lib/utils/api-response';
import { isValidUUID } from '@/lib/utils/validation';

const schema = z.object({ member: z.string().uuid() });

// POST /api/rewards/claims/[id]/cancel { member } - a member cancels an unused claim; points come back
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const parsed = schema.safeParse(await request.json().catch(() => undefined));
  if (!isValidUUID(id) || !parsed.success) return ApiErrors.NotFound('Claim');

  try {
    const claim = await getClaim(id);
    if (!claim || claim.member.id !== parsed.data.member) return ApiErrors.NotFound('Claim');
    const result = await closeClaim(id, 'cancelled', null, 'Cancelled by the member');
    if ('error' in result) return ApiErrors.BadRequest(result.error);
    return successResponse(await getClaim(id), 'Cancelled');
  } catch (error) {
    console.error('Claim cancel error:', error);
    return ApiErrors.ServerError('Couldn’t cancel the claim');
  }
}
