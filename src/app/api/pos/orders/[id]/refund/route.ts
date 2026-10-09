import { NextRequest } from 'next/server';
import { z } from 'zod';
import { requireTeamPermission } from '@/lib/middleware/auth';
import { parseBody } from '@/lib/crm/route-helpers';
import { refundOrder } from '@/lib/db/repositories/loyalty';
import { getOrderItems } from '@/lib/db/repositories/pos-orders';
import { restoreStockForOrder } from '@/lib/db/repositories/inventory';
import { logAudit } from '@/lib/db/repositories/audit-log';
import { ApiErrors, successResponse } from '@/lib/utils/api-response';
import { isValidUUID } from '@/lib/utils/validation';

const schema = z.object({ reason: z.string().trim().max(300).optional() });

/**
 * POST /api/pos/orders/[id]/refund { reason? } - after refunding the money
 * (in SumUp, or cash back), mark the order refunded: stock goes back and the
 * points it earned are taken back (never below zero).
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireTeamPermission('venue.manage');
  if ('response' in auth) return auth.response;
  const { id } = await params;
  if (!isValidUUID(id)) return ApiErrors.NotFound('Order');
  const body = await parseBody(request, schema);
  if ('response' in body) return body.response;

  try {
    const result = await refundOrder(id, body.data.reason || null, auth.session.userId ?? null);
    if ('error' in result) return ApiErrors.BadRequest(result.error);

    try {
      const items = await getOrderItems(id);
      await restoreStockForOrder(
        id,
        items.map((item) => ({ product_id: item.product_id || '', quantity: item.quantity })),
        auth.session.userId || undefined
      );
    } catch (error) {
      console.error('Failed to restore stock for refunded order:', id, error); // refund stands; fix stock by hand
    }

    await logAudit({ userId: auth.session.userId, name: auth.session.name }, 'refund', 'pos_order', id, {
      after: { reason: body.data.reason || null, points_reversed: result.pointsReversed },
    });
    return successResponse({ points_reversed: result.pointsReversed }, 'Order refunded');
  } catch (error) {
    console.error('Error refunding order:', error);
    return ApiErrors.ServerError('Failed to refund the order');
  }
}
