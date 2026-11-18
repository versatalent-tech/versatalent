import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage, type RGB } from 'pdf-lib';
import QRCode from 'qrcode';
import type { DoorTicket } from '@/lib/db/repositories/door-tickets';
import { LOGO_DARK_PNG, LOGO_WHITE_PNG, TICKET_TEMPLATE_PDF } from '@/lib/tickets/template/assets';

export interface TicketPdfInput {
  reference: string;
  buyerName: string;
  event: { title: string; startsAt: string | null; venueName: string | null; city: string | null };
  tickets: DoorTicket[];
}

/**
 * The ticket design (src/lib/tickets/template/ticket-template.pdf). Positions
 * are the template's own, in PDF points from the bottom left. The template's
 * form fields mark where each detail goes; they're removed and the text is
 * drawn in their place so long names can shrink to fit.
 */
const WHITE = rgb(1, 1, 1);
const INK = rgb(0.137, 0.145, 0.161);
const MUTED = rgb(0.478, 0.463, 0.431);
const LIGHT_BG = rgb(0.961, 0.953, 0.937);
const DARK_BG = rgb(0.063, 0.071, 0.078);

type Box = { x: number; y: number; width: number; height: number };

const FIELDS = {
  event_name: { size: 28, min: 13, bold: true, color: WHITE, lines: 2 },
  event_date: { size: 15, min: 9, bold: false, color: WHITE, lines: 1 },
  doors_open: { size: 16, min: 9, bold: false, color: WHITE, lines: 1 },
  venue: { size: 15, min: 9, bold: false, color: WHITE, lines: 1 },
  location: { size: 15, min: 9, bold: false, color: WHITE, lines: 1 },
  ticket_type: { size: 15, min: 9, bold: true, color: INK, lines: 1 },
  attendee_name: { size: 15, min: 9, bold: false, color: INK, lines: 1 },
  booking_reference: { size: 15, min: 9, bold: false, color: INK, lines: 1 },
} as const;
type FieldName = keyof typeof FIELDS;

/** The two dashed "LOGO" boxes, with the colour behind each (to cover the placeholder) */
const LOGOS = [
  { box: { x: 41.4, y: 760.29, width: 29.2, height: 32.2 }, background: LIGHT_BG, dark: true },
  { box: { x: 60.4, y: 660.29, width: 22.2, height: 23.2 }, background: DARK_BG, dark: false },
];

/** Inside the gold corner marks of the QR box (corners at 382..516 by 186..320) */
const QR_AREA = { x: 384, y: 188, width: 130, height: 130 };

/** The standard PDF fonts only cover Western European characters; swap the rest */
function printable(text: string): string {
  return text
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, '-')
    .replace(/[^\x20-\x7E\xA0-\xFF€]/g, '?');
}

function londonParts(startsAt: string | null): { date: string; time: string } {
  if (!startsAt) return { date: 'TO BE ANNOUNCED', time: '-' };
  const d = new Date(startsAt);
  const date = new Intl.DateTimeFormat('en-GB', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric', timeZone: 'Europe/London' })
    .format(d)
    .replace(/^(\w+) /, '$1, ');
  const time = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/London' }).format(d);
  return { date: date.toUpperCase(), time };
}

/** Split into at most `lines` lines that each fit `width` at `size`; null if it can't */
function wrap(text: string, font: PDFFont, size: number, width: number, lines: number): string[] | null {
  const words = text.split(/\s+/).filter(Boolean);
  const out: string[] = [];
  let line = '';
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(next, size) <= width) {
      line = next;
    } else {
      if (!line || out.length + 1 >= lines) return null;
      out.push(line);
      line = word;
      if (font.widthOfTextAtSize(line, size) > width) return null;
    }
  }
  if (line) out.push(line);
  return out.length <= lines ? out : null;
}

/** Draw text in a field's box: the template size if it fits, else smaller (and onto a second line where allowed) */
function drawField(page: PDFPage, box: Box, value: string, fonts: { regular: PDFFont; bold: PDFFont }, spec: (typeof FIELDS)[FieldName]) {
  const font = spec.bold ? fonts.bold : fonts.regular;
  const text = printable(value);
  const pad = 2;
  const width = box.width - pad * 2;
  for (let size = spec.size; size >= spec.min; size -= 1) {
    for (let count = 1; count <= spec.lines; count++) {
      const lines = wrap(text, font, size, width, count);
      if (!lines || lines.length * size * 1.1 > box.height + 2) continue;
      const lineHeight = size * 1.1;
      // Centre the block vertically in the box
      let y = box.y + (box.height + lines.length * lineHeight) / 2 - size * 0.95;
      for (const line of lines) {
        page.drawText(line, { x: box.x + pad, y, size, font, color: spec.color });
        y -= lineHeight;
      }
      return;
    }
  }
  // Still too long at the smallest size: cut it short
  let cut = text;
  while (cut.length > 1 && font.widthOfTextAtSize(`${cut}...`, spec.min) > width) cut = cut.slice(0, -1);
  page.drawText(`${cut}...`, { x: box.x + pad, y: box.y + (box.height - spec.min) / 2 + 1, size: spec.min, font, color: spec.color });
}

function centredText(page: PDFPage, text: string, cx: number, y: number, font: PDFFont, size: number, color: RGB) {
  const safe = printable(text);
  page.drawText(safe, { x: cx - font.widthOfTextAtSize(safe, size) / 2, y, size, font, color });
}

/** The order's tickets on the VersaTalent design: one A4 page per ticket, each with its own QR code */
export async function buildTicketPdf(input: TicketPdfInput): Promise<Uint8Array> {
  // The template with its placeholder fields taken out, keeping where each one was
  const template = await PDFDocument.load(Buffer.from(TICKET_TEMPLATE_PDF, 'base64'));
  const form = template.getForm();
  const boxes = {} as Record<FieldName, Box>;
  for (const name of Object.keys(FIELDS) as FieldName[]) {
    const field = form.getTextField(name);
    boxes[name] = field.acroField.getWidgets()[0].getRectangle();
    form.removeField(field);
  }

  const pdf = await PDFDocument.create();
  pdf.setTitle(`VersaTalent ticket ${input.reference}`);
  pdf.setAuthor('VersaTalent');
  const fonts = { regular: await pdf.embedFont(StandardFonts.Helvetica), bold: await pdf.embedFont(StandardFonts.HelveticaBold) };
  const logoDark = await pdf.embedPng(Buffer.from(LOGO_DARK_PNG, 'base64'));
  const logoWhite = await pdf.embedPng(Buffer.from(LOGO_WHITE_PNG, 'base64'));
  const { date, time } = londonParts(input.event.startsAt);

  for (const ticket of input.tickets) {
    const [page] = await pdf.copyPages(template, [0]);
    pdf.addPage(page);

    for (const logo of LOGOS) {
      const { box } = logo;
      page.drawRectangle({ ...box, color: logo.background });
      const side = Math.min(box.width, box.height);
      page.drawImage(logo.dark ? logoDark : logoWhite, { x: box.x + (box.width - side) / 2, y: box.y + (box.height - side) / 2, width: side, height: side });
    }

    const values: Record<FieldName, string> = {
      event_name: input.event.title.toUpperCase(),
      event_date: date,
      doors_open: time,
      venue: (input.event.venueName ?? 'TO BE ANNOUNCED').toUpperCase(),
      location: (input.event.city ?? '-').toUpperCase(),
      ticket_type: `${ticket.ticket_type_name.toUpperCase()}${ticket.quantity > 1 ? ` · ${ticket.number} OF ${ticket.quantity}` : ''}`,
      attendee_name: input.buyerName.toUpperCase(),
      booking_reference: input.reference,
    };
    for (const name of Object.keys(FIELDS) as FieldName[]) drawField(page, boxes[name], values[name], fonts, FIELDS[name]);

    // The QR code over the "QR CODE / RESERVED SPACE" placeholder, with the code under it for typing in by hand
    page.drawRectangle({ ...QR_AREA, color: WHITE });
    const png = await QRCode.toBuffer(ticket.code, { errorCorrectionLevel: 'M', margin: 1, width: 600 });
    const qrSide = 110;
    const cx = QR_AREA.x + QR_AREA.width / 2;
    page.drawImage(await pdf.embedPng(png), { x: cx - qrSide / 2, y: QR_AREA.y + QR_AREA.height - qrSide - 4, width: qrSide, height: qrSide });
    centredText(page, ticket.code, cx, QR_AREA.y + 4, fonts.regular, 7, MUTED);
  }
  return pdf.save();
}
