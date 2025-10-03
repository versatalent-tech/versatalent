import Link from 'next/link';
import Image from 'next/image';
import { eventsSeed, isUpcoming, toDate } from '@/lib/data/events';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export function FeaturedEvents() {
  const upcoming = eventsSeed.filter(e => isUpcoming(e)).sort((a,b)=> (toDate(a.dateStart)!.getTime() - toDate(b.dateStart)!.getTime())).slice(0,3);
  if (upcoming.length === 0) return null;
  return (
    <section className="py-16">
      <div className="container mx-auto px-4">
        <div className="flex items-end justify-between mb-6">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold">Featured Events</h2>
            <p className="text-gray-600">Catch what’s coming up soon.</p>
          </div>
          <Link href="/events" className="text-gold hover:underline">Browse all →</Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {upcoming.map(ev => (
            <Card key={ev.id} className="overflow-hidden">
              <div className="relative h-44 w-full bg-gray-100">
                {ev.coverImage && <Image src={ev.coverImage} alt={ev.title} fill className="object-cover" />}
                <div className="absolute left-3 top-3">
                  <Badge className="bg-green-600 text-white">Upcoming</Badge>
                </div>
              </div>
              <CardHeader>
                <CardTitle className="line-clamp-1">{ev.title}</CardTitle>
                <div className="text-sm text-gray-600">
                  {toDate(ev.dateStart)?.toLocaleString()} · {ev.venue?.city}{ev.venue?.country ? `, ${ev.venue.country}` : ''}
                </div>
              </CardHeader>
              <CardContent>
                <Link href={`/events/${ev.id}`} className="text-gold font-medium hover:underline">View details →</Link>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
