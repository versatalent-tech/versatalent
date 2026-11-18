/**
 * An order's confirmation PDF (one QR code per ticket), made and stored once
 * and served to the admin (Tickets, Customer messages) and to the buyer
 * (their order page). Server only.
 */
import { NextResponse } from 'next/server';
import { ensureOrderTickets, setOrderPdf, type PdfOrder } from '@/lib/db/repositories/door-tickets';
import { buildTicketPdf } from '@/lib/tickets/pdf';
import { readDocumentFile, saveDocumentFile } from '@/lib/services/document-storage';

/** The logo from the site itself (public files aren't bundled with the functions) */
async function loadLogo(origin: string): Promise<Uint8Array | null> {
  try {
    const response = await fetch(`${origin}/images/versatalent-new-logo.png`, { signal: AbortSignal.timeout(3000) });
    return response.ok ? new Uint8Array(await response.arrayBuffer()) : null;
  } catch {
    return null;
  }
}

/** Make (or remake) the PDF for a paid order and store it. The ticket QR codes never change. */
export async function makeOrderPdf(order: PdfOrder, origin: string): Promise<Uint8Array> {
  const tickets = await ensureOrderTickets(order.id);
  const bytes = await buildTicketPdf({
    reference: order.reference,
    buyerName: order.buyer_name,
    event: { title: order.event_title, startsAt: order.event_starts_at, venue: order.venue },
    tickets,
    logo: await loadLogo(origin),
  });
  const key = `tickets/${order.id}.pdf`;
  await saveDocumentFile(key, bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer);
  await setOrderPdf(order.id, key);
  return bytes;
}

/** The stored PDF, or null if it hasn't been made (or the file has gone) */
export async function storedOrderPdf(order: PdfOrder): Promise<ArrayBuffer | Uint8Array | null> {
  if (!order.pdf_key) return null;
  return readDocumentFile(order.pdf_key);
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
