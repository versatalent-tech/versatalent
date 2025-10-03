import Link from 'next/link';
import { eventsSeed, toDate, isUpcoming, isOngoing } from '@/lib/data/events';

function getMonthMatrix(year: number, month: number) {
  const first = new Date(year, month, 1);
  const startDay = first.getDay(); // 0-6
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const matrix: Array<Array<Date | null>> = [];
  let week: Array<Date | null> = new Array(startDay).fill(null);

  for (let d = 1; d <= daysInMonth; d++) {
    week.push(new Date(year, month, d));
    if (week.length === 7) {
      matrix.push(week);
      week = [];
    }
  }
  if (week.length) matrix.push([...week, ...new Array(7 - week.length).fill(null)]);
  return matrix;
}

export default function CalendarPage({ searchParams }: { searchParams: { y?: string; m?: string } }) {
  const now = new Date();
  const year = Number(searchParams.y || now.getFullYear());
  const month = Number(searchParams.m || now.getMonth()); // 0-indexed

  const matrix = getMonthMatrix(year, month);
  const monthEvents = eventsSeed.filter(e => {
    const start = toDate(e.dateStart);
    return start && start.getFullYear() === year && start.getMonth() === month;
  });

  const prevLink = `/events/calendar?y=${month === 0 ? year - 1 : year}&m=${month === 0 ? 11 : month - 1}`;
  const nextLink = `/events/calendar?y=${month === 11 ? year + 1 : year}&m=${month === 11 ? 0 : month + 1}`;

  const monthLabel = new Date(year, month, 1).toLocaleString('default', { month: 'long', year: 'numeric' });

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="flex items-center justify-between mb-6">
        <Link href={prevLink} className="px-3 py-1 rounded border">Prev</Link>
        <h1 className="text-2xl font-bold">{monthLabel}</h1>
        <Link href={nextLink} className="px-3 py-1 rounded border">Next</Link>
      </div>

      <div className="flex items-center gap-2 mb-4">
        <Link href={`/events/calendar`} className="px-3 py-1 rounded border bg-gray-50">Month</Link>
        <Link href={`/events/calendar/week`} className="px-3 py-1 rounded border">Week</Link>
        <Link href={`/events/calendar/day`} className="px-3 py-1 rounded border">Day</Link>
      </div>

      <div className="grid grid-cols-7 gap-2 text-sm mb-2 text-gray-500">
        {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => (<div key={d} className="text-center">{d}</div>))}
      </div>

      <div className="grid grid-cols-7 gap-2">
        {matrix.map((week, wi) => (
          <div key={wi} className="contents">
            {week.map((date, di) => {
              const events = date ? monthEvents.filter(e => {
                const start = toDate(e.dateStart)!;
                return start.getDate() === date.getDate();
              }) : [];

              return (
                <div key={`${wi}-${di}`} className="min-h-24 border rounded p-2">
                  <div className="text-xs text-gray-500 mb-1">{date ? date.getDate() : ''}</div>
                  <div className="space-y-1">
                    {events.map(ev => (
                      <Link key={ev.id} href={`/events/${ev.id}`} className={`block text-xs rounded px-2 py-1 ${isOngoing(ev) ? 'bg-blue-100 text-blue-700' : isUpcoming(ev) ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                        {ev.title}
                      </Link>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      <div className="mt-6 text-sm">
        <Link href="/api/events/ics" className="text-gold hover:underline">Download Upcoming Events (ICS)</Link>
      </div>
    </div>
  );
}
