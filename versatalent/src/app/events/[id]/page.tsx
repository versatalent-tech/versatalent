"use client";
import dynamic from 'next/dynamic';
import { useMemo } from 'react';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { eventsSeed, toDate, isOngoing, isUpcoming, isPast, daysUntil, daysSince, type EventVenue as EVVenue } from '@/lib/data/events';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getTalentById } from '@/lib/data/talents';

type Venue = Pick<EVVenue, 'name' | 'address' | 'city' | 'country' | 'lat' | 'lng'>;

// Client-only Leaflet map with geocoding fallback (dynamically imported)
const LeafletMap = dynamic<{ venue: Venue; className?: string }>(
  async () => {
    const L = await import('leaflet');
    await import('leaflet/dist/leaflet.css');
    const React = await import('react');
    const { useEffect, useRef } = React;

    function MapImpl({ venue, className }: { venue: Venue; className?: string }) {
      const mapDivRef = useRef<HTMLDivElement | null>(null);

      useEffect(() => {
        if (!mapDivRef.current) return;

        const map = L.map(mapDivRef.current, { zoomControl: true, attributionControl: true });

        function setMarker(lat: number, lng: number) {
          L.marker([lat, lng])
            .addTo(map)
            .bindPopup([venue?.name, venue?.city, venue?.country].filter(Boolean).join(', '));
          map.setView([lat, lng], 13);
        }

        async function geocode(): Promise<{ lat: number; lng: number } | null> {
          const q = [venue?.address, venue?.city, venue?.country].filter(Boolean).join(', ');
          if (!q) return null;
          try {
            const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}`;
            const res = await fetch(url, { headers: { 'Accept-Language': 'en' } });
            const data: Array<{ lat?: string; lon?: string }> = await res.json();
            const item = data?.[0];
            if (item?.lat && item?.lon) return { lat: Number(item.lat), lng: Number(item.lon) };
          } catch {
            // ignore
          }
          return null;
        }

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
          attribution: '&copy; OpenStreetMap contributors'
        }).addTo(map);

        (async () => {
          if (typeof venue?.lat === 'number' && typeof venue?.lng === 'number') {
            setMarker(venue.lat, venue.lng);
          } else {
            const g = await geocode();
            if (g) setMarker(g.lat, g.lng);
            else map.setView([51.505, -0.09], 5);
          }
        })();

        return () => {
          map.remove();
        };
      }, [venue]);

      return <div ref={mapDivRef} className={className} />;
    }

    return MapImpl;
  },
  { ssr: false }
);

export default function EventDetail({ params }: { params: { id: string } }) {
  const ev = eventsSeed.find(e => e.id === params.id);

  // Call all hooks before any conditional returns
  const related = useMemo(
    () => {
      if (!ev) return [];
      return (ev.talentIds || [])
        .map((tid) => getTalentById(tid))
        .filter((t): t is NonNullable<ReturnType<typeof getTalentById>> => Boolean(t));
    },
    [ev, ev?.talentIds]
  );

  // Handle not found case after all hooks are called
  if (!ev) return notFound();

  const start = toDate(ev.dateStart);
  const end = toDate(ev.dateEnd);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: ev.title,
    description: ev.description,
    startDate: ev.dateStart,
    endDate: ev.dateEnd || ev.dateStart,
    eventStatus: 'https://schema.org/EventScheduled',
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    location: ev.venue?.name
      ? {
          '@type': 'Place',
          name: ev.venue.name,
          address: [ev.venue.city, ev.venue.country].filter(Boolean).join(', '),
        }
      : undefined,
    image: ev.coverImage ? [ev.coverImage] : undefined,
    organizer: ev.organizer ? { '@type': 'Organization', name: ev.organizer } : undefined,
    offers:
      ev.priceFromGBP || ev.priceToGBP
        ? {
            '@type': 'Offer',
            priceCurrency: 'GBP',
            price: ev.priceFromGBP || 0,
            url: ev.ticketUrl || undefined,
            availability: 'https://schema.org/InStock',
          }
        : undefined,
  } as const;

  return (
    <div className="container mx-auto px-4 py-12">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <div className="relative h-64 w-full rounded-lg overflow-hidden bg-gray-100">
            {ev.coverImage && (
              <Image src={ev.coverImage} alt={ev.title} fill className="object-cover" />
            )}
            <div className="absolute left-3 top-3 space-x-2">
              {isOngoing(ev) && <Badge className="bg-blue-600 text-white">Ongoing</Badge>}
              {isUpcoming(ev) && <Badge className="bg-green-600 text-white">Upcoming</Badge>}
              {isPast(ev) && <Badge className="bg-gray-600 text-white">Past</Badge>}
            </div>
          </div>

          <h1 className="text-3xl font-bold mt-6 mb-2">{ev.title}</h1>
          <div className="text-gray-600 mb-4">
            {start?.toLocaleString()} {end ? `– ${end.toLocaleString()}` : ''}
          </div>

          {isUpcoming(ev) && (
            <div className="mb-4 text-green-700">Starts in {daysUntil(ev)} days</div>
          )}
          {isPast(ev) && (
            <div className="mb-4 text-gray-600">Ended {daysSince(ev)} days ago</div>
          )}

          <p className="text-gray-800 leading-relaxed">{ev.description}</p>

          {ev.tags && ev.tags.length > 0 && (
            <div className="mt-6 flex flex-wrap gap-2">
              {ev.tags.map((t) => (
                <Badge key={t} variant="secondary">
                  {t}
                </Badge>
              ))}
            </div>
          )}

          {ev.venue?.city && ev.venue?.country && (
            <div className="mt-8">
              <div className="text-sm text-gray-600 mb-2">Location</div>
              <LeafletMap
                venue={ev.venue as Venue}
                className="w-full h-56 rounded-lg overflow-hidden border"
              />
            </div>
          )}

          {related && related.length > 0 && (
            <div className="mt-10">
              <h2 className="text-xl font-semibold mb-4">Featuring</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {related.map((t) => (
                  <Link
                    key={t.id}
                    href={`/talents/${t.id}`}
                    className="group block rounded-lg border p-4 hover:shadow-sm"
                  >
                    <div className="font-medium group-hover:text-gold">{t.name}</div>
                    <div className="text-sm text-gray-600 capitalize">
                      {t.profession} • {t.industry}
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Event Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {ev.venue?.name && (
                <div>
                  <div className="text-gray-500">Venue</div>
                  <div className="font-medium">{ev.venue.name}</div>
                  <div className="text-gray-600">
                    {[ev.venue.city, ev.venue.country].filter(Boolean).join(', ')}
                  </div>
                </div>
              )}
              {ev.organizer && (
                <div>
                  <div className="text-gray-500">Organizer</div>
                  <div className="font-medium">{ev.organizer}</div>
                </div>
              )}
              {(ev.priceFromGBP ?? ev.priceToGBP) !== undefined && (
                <div>
                  <div className="text-gray-500">Price</div>
                  <div className="font-medium">
                    {ev.priceFromGBP ? `£${ev.priceFromGBP.toFixed(2)}` : 'Free'}{' '}
                    {ev.priceToGBP ? `– £${ev.priceToGBP.toFixed(2)}` : ''}
                  </div>
                </div>
              )}
              {ev.ticketUrl && (
                <Link
                  href={ev.ticketUrl}
                  className="inline-block mt-2 text-gold font-medium hover:underline"
                >
                  Get Tickets →
                </Link>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
