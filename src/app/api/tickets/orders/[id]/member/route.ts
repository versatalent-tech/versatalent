import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getOrderWithToken } from '@/lib/db/repositories/tickets';
import { addMembershipAfterPurchase } from '@/lib/services/ticket-payments';
import { ApiErrors, successResponse } from '@/lib/utils/api-response';
import { isValidUUID } from '@/lib/utils/validation';

const schema = z.object({
  k: z.string().min(1).max(200),
  email: z.string().trim().toLowerCase().email('Enter a valid email').max(200),
});

/**
 * POST /api/tickets/orders/[id]/member { k, email } - a buyer adding their
 * membership after paying (the order page link carries k). The answer is the
 * same whether or not the email is a membership.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isValidUUID(id)) return ApiErrors.NotFound('Order');
  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return ApiErrors.BadRequest(parsed.error.issues[0]?.message ?? 'Enter a valid email');

  try {
    const order = await getOrderWithToken(id, parsed.data.k);
    if (!order) return ApiErrors.NotFound('Order');
    if (order.status !== 'paid') {
      return NextResponse.json({ success: false, error: 'You can add your membership once the order is paid' }, { status: 409 });
    }
    await addMembershipAfterPurchase(id, parsed.data.email);
    return successResponse(null, 'If that’s a membership email, the points are on it now.');
  } catch (error) {
    console.error('Error adding a membership to a ticket order:', error);
    return ApiErrors.ServerError('Couldn’t add your membership');
  }
}
