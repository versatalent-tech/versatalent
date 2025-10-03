import Link from 'next/link';
import { eventsSeed, toDate, isUpcoming, isOngoing } from '@/lib/data/events';

function startOfWeek(d: Date) {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day; // start on Sunday
  return new Date(date.getFullYear(), date.getMonth(), diff);
}

function addDays(d: Date, n: number) {
  const dd = new Date(d);
  dd.setDate(dd.getDate() + n);
  return dd;
}

function getWeekDays(anchor: Date) {
  const start = startOfWeek(anchor);
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

export default function WeekView({ searchParams }: { searchParams: { d?: string } }) {
  const anchor = searchParams.d ? new Date(searchParams.d) : new Date();
  const days = getWeekDays(anchor);

  const prev = new Date(anchor); prev.setDate(anchor.getDate() - 7);
  const next = new Date(anchor); next.setDate(anchor.getDate() + 7);

  // Events intersecting any day this week
  const weekEvents = eventsSeed.filter(e => {
    const s = toDate(e.dateStart);
    if (!s) return false;
    const day0 = days[0];
    const day6 = days[6];
    return s >= new Date(day0.getFullYear(), day0.getMonth(), day0.getDate()) && s <= new Date(day6.getFullYear(), day6.getMonth(), day6.getDate(), 23,59,59);
  });

  const weekLabel = `${days[0].toLocaleDateString(undefined,{ month:'short', day:'numeric'})} – ${days[6].toLocaleDateString(undefined,{ month:'short', day:'numeric', year:'numeric'})}`;

  return (
    <div className="container mx-auto px-4 py-12 grid grid-cols-1 lg:grid-cols-4 gap-6">
      <aside className="lg:col-span-1 sticky top-20 self-start">
        <div className="mb-4 flex items-center justify-between">
          <Link href={`/events/calendar/week?d=${prev.toISOString()}`} className="px-3 py-1 rounded border">Prev</Link>
          <h1 className="text-xl font-semibold">{weekLabel}</h1>
          <Link href={`/events/calendar/week?d=${next.toISOString()}`} className="px-3 py-1 rounded border">Next</Link>
        </div>
        {/* Mini month picker */}
        <MiniMonth anchor={anchor} />
        <div className="mt-4 text-sm"><Link href="/events/calendar" className="text-gold hover:underline">Month view</Link> · <Link href={`/events/calendar/day?d=${anchor.toISOString()}`} className="text-gold hover:underline">Day view</Link></div>
      </aside>

      <main className="lg:col-span-3">
        <div className="grid grid-cols-7 gap-2 text-sm mb-2 text-gray-500">
          {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map((d,i)=> (
            <div key={d} className="text-center">{d} {days[i].getDate()}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-2">
          {days.map((day,i)=>{
            const events = weekEvents.filter(e=> {
              const s = toDate(e.dateStart)!;
              return s.toDateString() === day.toDateString();
            });
            return (
              <div key={i} className="min-h-40 border rounded p-2 space-y-2">
                {events.map(ev => (
                  <Link key={ev.id} href={`/events/${ev.id}`} className={`block text-xs rounded px-2 py-1 ${isOngoing(ev) ? 'bg-blue-100 text-blue-700' : isUpcoming(ev) ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                    {ev.title}
                  </Link>
                ))}
              </div>
            );
          })}
        </div>
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
              const href = date ? `/events/calendar/week?d=${date.toISOString()}` : '#';
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
