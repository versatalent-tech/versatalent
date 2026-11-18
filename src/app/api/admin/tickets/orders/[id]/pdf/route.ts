import { NextRequest, NextResponse } from 'next/server';
import { requireTeamPermission } from '@/lib/middleware/auth';
import { getPdfOrder } from '@/lib/db/repositories/door-tickets';
import { makeOrderPdf, storedOrderPdf, ticketPdfResponse } from '@/lib/tickets/order-pdf';
import { ApiErrors } from '@/lib/utils/api-response';
import { isValidUUID } from '@/lib/utils/validation';

export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ id: string }> };

// POST /api/admin/tickets/orders/[id]/pdf - make (or remake) the order's confirmation PDF and download it
export async function POST(request: NextRequest, { params }: Params) {
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
    return ticketPdfResponse(order, await makeOrderPdf(order, request.nextUrl.origin));
  } catch (error) {
    console.error('Error making ticket PDF:', error);
    return ApiErrors.ServerError('Failed to make the PDF');
  }
}

// GET /api/admin/tickets/orders/[id]/pdf - download the stored PDF
export async function GET(_request: NextRequest, { params }: Params) {
  const auth = await requireTeamPermission('venue.manage');
  if ('response' in auth) return auth.response;
  const { id } = await params;
  if (!isValidUUID(id)) return ApiErrors.NotFound('Order');

  try {
    const order = await getPdfOrder(id);
    if (!order) return ApiErrors.NotFound('PDF');
    const bytes = await storedOrderPdf(order);
    if (!bytes) return ApiErrors.NotFound('PDF');
    return ticketPdfResponse(order, bytes);
  } catch (error) {
    console.error('Error downloading ticket PDF:', error);
    return ApiErrors.ServerError('Failed to download the PDF');
  }
}
