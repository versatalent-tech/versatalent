import Link from 'next/link';
import { eventsSeed, toDate, isUpcoming, isOngoing } from '@/lib/data/events';

export default function DayView({ searchParams }: { searchParams: { d?: string } }) {
  const date = searchParams.d ? new Date(searchParams.d) : new Date();
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const end = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23,59,59);

  const events = eventsSeed.filter(e => {
    const s = toDate(e.dateStart);
    if (!s) return false;
    return s >= start && s <= end;
  });

  const prev = new Date(start); prev.setDate(start.getDate() - 1);
  const next = new Date(start); next.setDate(start.getDate() + 1);

  const label = start.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

  return (
    <div className="container mx-auto px-4 py-12 grid grid-cols-1 lg:grid-cols-4 gap-6">
      <aside className="lg:col-span-1 sticky top-20 self-start">
        <div className="mb-4 flex items-center justify-between">
          <Link href={`/events/calendar/day?d=${prev.toISOString()}`} className="px-3 py-1 rounded border">Prev</Link>
          <h1 className="text-xl font-semibold">{label}</h1>
          <Link href={`/events/calendar/day?d=${next.toISOString()}`} className="px-3 py-1 rounded border">Next</Link>
        </div>
        <MiniMonth anchor={start} />
        <div className="mt-4 text-sm"><Link href="/events/calendar" className="text-gold hover:underline">Month view</Link> · <Link href={`/events/calendar/week?d=${start.toISOString()}`} className="text-gold hover:underline">Week view</Link></div>
      </aside>

      <main className="lg:col-span-3">
        {events.length === 0 ? (
          <div className="text-gray-600">No events today.</div>
        ) : (
          <ul className="space-y-3">
            {events.map(ev => (
              <li key={ev.id} className={`border rounded p-3 ${isOngoing(ev) ? 'bg-blue-50' : isUpcoming(ev) ? 'bg-green-50' : 'bg-gray-50'}`}>
                <div className="text-sm text-gray-600">{new Date(ev.dateStart).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                <Link href={`/events/${ev.id}`} className="font-medium text-gold hover:underline">{ev.title}</Link>
                <div className="text-sm text-gray-600">{ev.venue?.city}, {ev.venue?.country}</div>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}

function getMonthMatrix(year: number, month: number) {
  const first = new Date(year, month, 1);
  const startDay = first.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const matrix: Array<Array<Date | null>> = [];
  let week: Array<Date | null> = new Array(startDay).fill(null);
  for (let d = 1; d <= daysInMonth; d++) {
    week.push(new Date(year, month, d));
    if (week.length === 7) { matrix.push(week); week = []; }
  }
  if (week.length) matrix.push([...week, ...new Array(7 - week.length).fill(null)]);
  return matrix;
}

function MiniMonth({ anchor }: { anchor: Date }) {
  const year = anchor.getFullYear();
  const month = anchor.getMonth();
  const matrix = getMonthMatrix(year, month);
  const label = new Date(year, month, 1).toLocaleString('default', { month: 'long', year: 'numeric' });
  return (
    <div className="border rounded p-3">
      <div className="text-sm font-medium text-center mb-2">{label}</div>
      <div className="grid grid-cols-7 gap-1 text-[10px] text-gray-500 mb-1">
        {['S','M','T','W','T','F','S'].map(d => <div key={d} className="text-center">{d}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {matrix.map((week, wi) => (
          <div key={wi} className="contents">
            {week.map((date, di) => {
              const isToday = date && new Date().toDateString() === date.toDateString();
              const href = date ? `/events/calendar/day?d=${date.toISOString()}` : '#';
              return (
                <Link key={`${wi}-${di}`} href={href} className={`block text-center rounded px-1 py-1 text-xs ${isToday ? 'bg-gold text-white' : 'hover:bg-gray-50'}`}>
                  {date ? date.getDate() : ''}
                </Link>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
