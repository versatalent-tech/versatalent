import { NextRequest, NextResponse } from 'next/server';
import { requireTeamPermission } from '@/lib/middleware/auth';
import { getPdfOrder } from '@/lib/db/repositories/door-tickets';
import { currentOrderPdf, makeOrderPdf, ticketPdfResponse } from '@/lib/tickets/order-pdf';
import { ApiErrors } from '@/lib/utils/api-response';
import { isValidUUID } from '@/lib/utils/validation';

export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ id: string }> };

// POST /api/admin/tickets/orders/[id]/pdf - make (or remake) the order's confirmation PDF and download it
export async function POST(_request: NextRequest, { params }: Params) {
  const auth = await requireTeamPermission('venue.manage');
  if ('response' in auth) return auth.response;
  const { id } = await params;
  if (!isValidUUID(id)) return ApiErrors.NotFound('Order');

  try {
    const order = await getPdfOrder(id);
    if (!order) return ApiErrors.NotFound('Order');
    if (order.status !== 'paid') {
      return NextResponse.json({ success: false, error: 'Only paid orders have tickets' }, { status: 409 });
    }
    return ticketPdfResponse(order, await makeOrderPdf(order));
  } catch (error) {
    console.error('Error making ticket PDF:', error);
    return ApiErrors.ServerError('Failed to make the PDF');
  }
}

// GET /api/admin/tickets/orders/[id]/pdf - download the PDF once made (made again if the event or design changed since)
export async function GET(_request: NextRequest, { params }: Params) {
  const auth = await requireTeamPermission('venue.manage');
  if ('response' in auth) return auth.response;
  const { id } = await params;
  if (!isValidUUID(id)) return ApiErrors.NotFound('Order');

  try {
    const order = await getPdfOrder(id);
    if (!order?.pdf_key) return ApiErrors.NotFound('PDF');
    if (order.status !== 'paid') {
      return NextResponse.json({ success: false, error: 'Only paid orders have tickets' }, { status: 409 });
    }
    return ticketPdfResponse(order, await currentOrderPdf(order));
  } catch (error) {
    console.error('Error downloading ticket PDF:', error);
    return ApiErrors.ServerError('Failed to download the PDF');
  }
}
