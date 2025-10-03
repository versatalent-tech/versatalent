import { NextResponse } from 'next/server';
import { eventsSeed, isUpcoming } from '@/lib/data/events';

function escape(text: string) {
  return text.replace(/\\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');
}

export async function GET() {
  const upcoming = eventsSeed.filter(e => isUpcoming(e));
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//VersaTalent//EN',
    ...upcoming.flatMap(ev => [
      'BEGIN:VEVENT',
      `UID:${ev.id}@versatalent`,
      `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').split('.')[0]}Z`,
      `DTSTART:${new Date(ev.dateStart).toISOString().replace(/[-:]/g, '').split('.')[0]}Z`,
      `DTEND:${new Date(ev.dateEnd || ev.dateStart).toISOString().replace(/[-:]/g, '').split('.')[0]}Z`,
      `SUMMARY:${escape(ev.title)}`,
      ev.description ? `DESCRIPTION:${escape(ev.description)}` : '',
      ev.venue?.name ? `LOCATION:${escape([ev.venue.name, ev.venue.city, ev.venue.country].filter(Boolean).join(', '))}` : '',
      'END:VEVENT'
    ]),
    'END:VCALENDAR'
  ].filter(Boolean);

  return new NextResponse(lines.join('\r\n'), {
    status: 200,
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': 'attachment; filename="versatalent-upcoming.ics"'
    }
  });
}
