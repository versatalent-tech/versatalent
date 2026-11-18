/**
 * An order's ticket PDF (one QR code per ticket, on the VersaTalent design),
 * made and stored once and served to the admin (Tickets, Customer messages)
 * and to the buyer (their order page). Server only.
 */
import { NextResponse } from 'next/server';
import { ensureOrderTickets, setOrderPdf, type PdfOrder } from '@/lib/db/repositories/door-tickets';
import { buildTicketPdf } from '@/lib/tickets/pdf';
import { readDocumentFile, saveDocumentFile } from '@/lib/services/document-storage';

/**
 * Bump when the ticket design changes: PDFs stored under an older version
 * are made again the next time they're downloaded.
 */
const DESIGN_VERSION = 2;

const pdfKey = (orderId: string) => `tickets/${orderId}-v${DESIGN_VERSION}.pdf`;

/** Make (or remake) the PDF for a paid order and store it. The ticket QR codes never change. */
export async function makeOrderPdf(order: PdfOrder): Promise<Uint8Array> {
  const tickets = await ensureOrderTickets(order.id);
  // Refunded or cancelled since the caller checked: nothing to put on a PDF
  if (tickets.length === 0) throw new Error(`Order ${order.id} has no tickets`);
  const bytes = await buildTicketPdf({
    reference: order.reference,
    buyerName: order.buyer_name,
    event: { title: order.event_title, startsAt: order.event_starts_at, venueName: order.venue_name, city: order.venue_city },
    tickets,
  });
  const key = pdfKey(order.id);
  await saveDocumentFile(key, bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer);
  await setOrderPdf(order.id, key);
  return bytes;
}

/**
 * The stored PDF if it's still right: null if it hasn't been made, the file
 * has gone, it's on an older design, or the event was edited after it was made.
 */
export async function storedOrderPdf(order: PdfOrder): Promise<ArrayBuffer | Uint8Array | null> {
  if (!order.pdf_key || order.pdf_key !== pdfKey(order.id)) return null;
  if (order.event_updated_at && order.pdf_created_at && order.event_updated_at > order.pdf_created_at) return null;
  return readDocumentFile(order.pdf_key);
}

/** The stored PDF, or a fresh one when it's missing or out of date */
export async function currentOrderPdf(order: PdfOrder): Promise<ArrayBuffer | Uint8Array> {
  return (await storedOrderPdf(order)) ?? (await makeOrderPdf(order));
}

export function ticketPdfResponse(order: PdfOrder, bytes: ArrayBuffer | Uint8Array): NextResponse {
  const title = order.event_title.replace(/[^A-Za-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'Event';
  return new NextResponse(bytes instanceof Uint8Array ? new Uint8Array(bytes) : bytes, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="VersaTalent-${title}-${order.reference}.pdf"`,
      'Cache-Control': 'private, no-store',
    },
  });
}
