import { NextRequest } from 'next/server';
import { requireTalent } from '@/lib/auth/talent-auth';
import { parseBody } from '@/lib/crm/route-helpers';
import { respondSchema } from '@/lib/portal/schemas';
import { getTalentBooking, respondToBooking } from '@/lib/db/repositories/portal';
import { logAudit } from '@/lib/db/repositories/audit-log';
import { ApiErrors, successResponse } from '@/lib/utils/api-response';
import { isValidUUID } from '@/lib/utils/validation';

// POST /api/portal/bookings/[id]/respond - accept or decline a booking
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireTalent();
  if ('response' in auth) return auth.response;
  const { id } = await params;
  if (!isValidUUID(id)) return ApiErrors.NotFound('Booking');
  const body = await parseBody(request, respondSchema);
  if ('response' in body) return body.response;

  try {
    const ok = await respondToBooking(auth.talent, id, body.data.response!, body.data.note ?? null);
    if (!ok) return ApiErrors.BadRequest('This booking can no longer be answered');
    await logAudit({ userId: auth.talent.userId, name: auth.talent.talentName }, `booking_${body.data.response}`, 'booking', id, {
      after: { note: body.data.note ?? null },
    });
    return successResponse(await getTalentBooking(auth.talent.talentId, id));
  } catch (error) {
    console.error('Portal respond error:', error);
    return ApiErrors.ServerError('Failed to save your answer');
  }
}
