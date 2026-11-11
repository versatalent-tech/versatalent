import { NextRequest, NextResponse } from 'next/server';
import { requireTeamPermission } from '@/lib/middleware/auth';
import { ensureOrderTickets, getPdfOrder, setOrderPdf, type PdfOrder } from '@/lib/db/repositories/door-tickets';
import { buildTicketPdf } from '@/lib/tickets/pdf';
import { readDocumentFile, saveDocumentFile } from '@/lib/services/document-storage';
import { ApiErrors } from '@/lib/utils/api-response';
import { isValidUUID } from '@/lib/utils/validation';

export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ id: string }> };

function pdfResponse(order: PdfOrder, bytes: ArrayBuffer | Uint8Array) {
  const title = order.event_title.replace(/[^A-Za-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'Event';
  return new NextResponse(bytes instanceof Uint8Array ? new Uint8Array(bytes) : bytes, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="VersaTalent-${title}-${order.reference}.pdf"`,
      'Cache-Control': 'private, no-store',
    },
  });
}

/** The logo from the site itself (public files aren't bundled with the functions) */
async function loadLogo(origin: string): Promise<Uint8Array | null> {
  try {
    const response = await fetch(`${origin}/images/versatalent-new-logo.png`, { signal: AbortSignal.timeout(3000) });
    return response.ok ? new Uint8Array(await response.arrayBuffer()) : null;
  } catch {
    return null;
  }
}

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
    const tickets = await ensureOrderTickets(id);
    const bytes = await buildTicketPdf({
      reference: order.reference,
      buyerName: order.buyer_name,
      event: { title: order.event_title, startsAt: order.event_starts_at, venue: order.venue },
      tickets,
      logo: await loadLogo(request.nextUrl.origin),
    });
    const key = `tickets/${id}.pdf`;
    await saveDocumentFile(key, bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer);
    await setOrderPdf(id, key);
    return pdfResponse(order, bytes);
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
    if (!order?.pdf_key) return ApiErrors.NotFound('PDF');
    const bytes = await readDocumentFile(order.pdf_key);
    if (!bytes) return ApiErrors.NotFound('PDF');
    return pdfResponse(order, bytes);
  } catch (error) {
    console.error('Error downloading ticket PDF:', error);
    return ApiErrors.ServerError('Failed to download the PDF');
  }
}
