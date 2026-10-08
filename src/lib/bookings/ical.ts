import { BOOKING_STATUSES, type Availability, type Booking } from './types';

/**
 * Minimal iCalendar (RFC 5545) writer for the personal calendar feed.
 * Fees are never included: the feed ends up in third-party calendar apps.
 */

function escapeText(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/;/g, '\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
}

function utcStamp(iso: string): string {
  return new Date(iso).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

const compactDate = (day: string) => day.replace(/-/g, '');

function nextDay(day: string): string {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

/** Lines longer than 75 octets are folded with CRLF + space */
function fold(line: string): string {
  const bytes = Buffer.from(line, 'utf8');
  if (bytes.length <= 75) return line;
  const parts: string[] = [];
  let current = '';
  for (const char of line) {
    if (Buffer.byteLength(current + char, 'utf8') > (parts.length === 0 ? 75 : 74)) {
      parts.push(current);
      current = char;
    } else {
      current += char;
    }
  }
  parts.push(current);
  return parts.join('\r\n ');
}

export function buildCalendar(name: string, bookings: Booking[], availability: Availability[]): string {
  const now = utcStamp(new Date().toISOString());
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//VersaTalent//Bookings//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${escapeText(name)}`,
    'X-PUBLISHED-TTL:PT1H',
  ];

  for (const b of bookings) {
    const details = [
      `Status: ${BOOKING_STATUSES[b.status]}`,
      b.client && `Client: ${b.client.name}`,
      b.call_time && `Call time: ${b.call_time}`,
      (b.onsite_contact.name || b.onsite_contact.phone) &&
        `On-site contact: ${[b.onsite_contact.name, b.onsite_contact.phone].filter(Boolean).join(', ')}`,
      b.brief && `Brief: ${b.brief}`,
      b.logistics_notes && `Logistics: ${b.logistics_notes}`,
    ].filter(Boolean);

    lines.push(
      'BEGIN:VEVENT',
      `UID:booking-${b.id}@versatalent`,
      `DTSTAMP:${now}`,
      `LAST-MODIFIED:${utcStamp(b.updated_at)}`,
      `DTSTART:${utcStamp(b.starts_at)}`,
      `DTEND:${utcStamp(b.ends_at)}`,
      `SUMMARY:${escapeText(`${b.status === 'hold' ? '[HOLD] ' : ''}${b.talent.name}: ${b.title}`)}`,
      `STATUS:${b.status === 'hold' ? 'TENTATIVE' : b.status === 'cancelled' ? 'CANCELLED' : 'CONFIRMED'}`,
      ...(b.location ? [`LOCATION:${escapeText(b.location)}`] : []),
      `DESCRIPTION:${escapeText(details.join('\n'))}`,
      'END:VEVENT'
    );
  }

  for (const a of availability) {
    lines.push(
      'BEGIN:VEVENT',
      `UID:availability-${a.id}@versatalent`,
      `DTSTAMP:${now}`,
      `DTSTART;VALUE=DATE:${compactDate(a.starts_on)}`,
      `DTEND;VALUE=DATE:${compactDate(nextDay(a.ends_on))}`,
      `SUMMARY:${escapeText(`${a.talent.name} ${a.kind === 'tentative' ? 'maybe unavailable' : 'unavailable'}`)}`,
      'TRANSP:TRANSPARENT',
      ...(a.note ? [`DESCRIPTION:${escapeText(a.note)}`] : []),
      'END:VEVENT'
    );
  }

  lines.push('END:VCALENDAR');
  return lines.map(fold).join('\r\n') + '\r\n';
}
