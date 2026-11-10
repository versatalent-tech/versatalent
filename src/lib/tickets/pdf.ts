import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFImage } from 'pdf-lib';
import QRCode from 'qrcode';
import type { DoorTicket } from '@/lib/db/repositories/door-tickets';

export interface TicketPdfInput {
  reference: string;
  buyerName: string;
  event: { title: string; startsAt: string | null; venue: string | null };
  tickets: DoorTicket[];
  /** The VersaTalent logo (PNG); left out when missing */
  logo?: Uint8Array | null;
}

const A4 = { width: 595.28, height: 841.89 };
const MM = 72 / 25.4;
const GOLD = rgb(0.83, 0.69, 0.22);
const GREY = rgb(0.35, 0.35, 0.35);

/** The standard PDF fonts only cover Western European characters; swap the rest */
function printable(text: string): string {
  return text
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, '-')
    .replace(/[^\x20-\x7E\xA0-\xFF€]/g, '?');
}

function eventWhen(startsAt: string | null): string | null {
  if (!startsAt) return null;
  return new Intl.DateTimeFormat('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/London',
  }).format(new Date(startsAt));
}

function centred(page: ReturnType<PDFDocument['addPage']>, text: string, y: number, font: PDFFont, size: number, color = rgb(0, 0, 0)) {
  const safe = printable(text);
  const width = font.widthOfTextAtSize(safe, size);
  page.drawText(safe, { x: (A4.width - width) / 2, y, size, font, color });
}

/** The order's confirmation: one A4 page per ticket, each with its own QR code */
export async function buildTicketPdf(input: TicketPdfInput): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  pdf.setTitle(`VersaTalent ticket ${input.reference}`);
  pdf.setAuthor('VersaTalent');
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  let logo: PDFImage | null = null;
  if (input.logo) {
    try {
      logo = await pdf.embedPng(input.logo);
    } catch {
      logo = null;
    }
  }
  const when = eventWhen(input.event.startsAt);
  const qrSize = 70 * MM;

  for (const ticket of input.tickets) {
    const page = pdf.addPage([A4.width, A4.height]);
    let y = A4.height - 60;
    if (logo) {
      const size = 60;
      page.drawImage(logo, { x: (A4.width - size) / 2, y: y - size, width: size, height: size });
      y -= size + 24;
    }
    centred(page, input.event.title, y, bold, 22);
    y -= 26;
    if (when) {
      centred(page, when, y, regular, 13, GREY);
      y -= 18;
    }
    if (input.event.venue) {
      centred(page, input.event.venue, y, regular, 13, GREY);
      y -= 18;
    }
    y -= 20;

    const png = await QRCode.toBuffer(ticket.code, { errorCorrectionLevel: 'M', margin: 1, width: 600 });
    const qr = await pdf.embedPng(png);
    page.drawImage(qr, { x: (A4.width - qrSize) / 2, y: y - qrSize, width: qrSize, height: qrSize });
    y -= qrSize + 18;
    centred(page, ticket.code, y, regular, 10, GREY);
    y -= 40;

    centred(page, input.buyerName, y, bold, 16);
    y -= 22;
    centred(page, `${ticket.ticket_type_name} · Ticket ${ticket.number} of ${ticket.quantity}`, y, regular, 13);
    y -= 18;
    centred(page, `Order ${input.reference}`, y, regular, 11, GREY);
    y -= 40;

    centred(page, 'Show this code at the door. It admits one person, once.', y, bold, 12, GOLD);
    y -= 18;
    centred(page, 'Ticket terms: versatalent.netlify.app/tickets/terms', y, regular, 9, GREY);
  }
  return pdf.save();
}
