"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Event } from "@/lib/db/types";
import type { Talent } from "@/lib/data/talents";
import { Calendar, MapPin, Clock, Users } from "lucide-react";

// Helper function to format event date
function formatEventDate(dateString: string | Date): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

export function UpcomingEvents() {
  const [events, setEvents] = useState<Event[]>([]);
  const [talents, setTalents] = useState<Map<string, Talent>>(new Map());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        // Fetch both upcoming featured events and talents in parallel
        const [eventsResponse, talentsResponse] = await Promise.all([
          fetch('/api/events?status=upcoming'),
          fetch('/api/talents')
        ]);

        const eventsData = await eventsResponse.json();
        const talentsData = await talentsResponse.json();

        // Create talent map for quick lookup
        const talentMap = new Map<string, Talent>();
        talentsData.forEach((talent: Talent) => {
          talentMap.set(talent.id, talent);
        });
        setTalents(talentMap);

        // Filter for featured events and limit to 3
        const featuredEvents = eventsData
          .filter((event: Event) => event.featured)
          .slice(0, 3);
        setEvents(featuredEvents);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <section className="py-16 bg-white">
        <div className="container px-4 mx-auto text-center">
          <p className="text-gray-600">Loading featured events...</p>
        </div>
      </section>
    );
  }

  if (events.length === 0) {
    return null; // Don't show section if no featured events
  }

  return (
    <section className="py-16 bg-white">
      <div className="container px-4 mx-auto">
        <div className="max-w-xl mx-auto text-center mb-16">
          <h2
            className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl"
            transition={{ duration: 0.5 }}
          >
            Featured <span className="text-gold">Events</span>
          </h2>
          <p
            className="mt-4 text-lg leading-8 text-gray-600"
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            Check out our latest performances and upcoming events featuring our talented artists
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {events.map((event, index) => {
            // Get all talents for this event
            const eventTalents = event.talent_ids
              .map(id => talents.get(id))
              .filter(Boolean) as Talent[];

            // Format the featuring text
            const formatFeaturing = () => {
              if (eventTalents.length === 0) return null;
              if (eventTalents.length === 1) return eventTalents[0].name;
              if (eventTalents.length === 2) return `${eventTalents[0].name} & ${eventTalents[1].name}`;
              return `${eventTalents[0].name}, ${eventTalents[1].name} & more`;
            };

            const featuringText = formatFeaturing();

            return (
              <div
                key={event.id}
                className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden hover:shadow-xl transition-all duration-300"
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <div className="relative h-48 w-full">
                  <Image
                    src={event.image_url || 'https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?w=800'}
                    alt={event.title}
                    fill
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    quality={75}
                    className="object-cover"
                    loading={index === 0 ? "eager" : "lazy"}
                    priority={index === 0}
                  />
                  <div className="absolute top-4 left-4 flex gap-2">
                    <Badge className="bg-gold text-white border-none">
                      {event.type.charAt(0).toUpperCase() + event.type.slice(1)}
                    </Badge>
                    {event.status === 'completed' && (
                      <Badge className="bg-gray-700 text-white border-none">
                        Past Event
                      </Badge>
                    )}
                  </div>
                  {event.price?.isFree && (
                    <div className="absolute top-4 right-4">
                      <Badge className="bg-green-600 text-white border-none">
                        Free
                      </Badge>
                    </div>
                  )}
                </div>

                <div className="p-6">
                  <h3 className="text-xl font-semibold text-foreground mb-2 line-clamp-2">
                    {event.title}
                  </h3>

                  {featuringText && (
                    <p className="text-sm text-gold mb-3 font-medium">
                      Featuring {featuringText}
                    </p>
                  )}

                  <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                    {event.description}
                  </p>

                  <div className="space-y-2 mb-4">
                    <div className="flex items-center text-sm text-gray-500">
                      <Calendar className="h-4 w-4 mr-2 text-gold" />
                      {formatEventDate(event.start_time)}
                    </div>

                    {event.display_time && (
                      <div className="flex items-center text-sm text-gray-500">
                        <Clock className="h-4 w-4 mr-2 text-gold" />
                        {event.display_time}
                      </div>
                    )}

                    <div className="flex items-center text-sm text-gray-500">
                      <MapPin className="h-4 w-4 mr-2 text-gold" />
                      {event.venue.name}, {event.venue.city}
                    </div>

                    {event.expected_attendance && (
                      <div className="flex items-center text-sm text-gray-500">
                        <Users className="h-4 w-4 mr-2 text-gold" />
                        Expected: {event.expected_attendance.toLocaleString()} attendees
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="text-sm">
                      {event.price?.isFree ? (
                        <span className="text-green-600 font-semibold">Free Event</span>
                      ) : event.price ? (
                        <span className="text-gray-900 font-semibold">
                          From {event.price.currency === 'USD' ? '$' : '£'}{event.price.min}
                          {event.price.max && ` - ${event.price.currency === 'USD' ? '$' : '£'}${event.price.max}`}
                        </span>
                      ) : null}
                    </div>

                    <Link href={`/events/${event.id}`}>
                      <Button
                        size="sm"
                        className="bg-gold hover:bg-gold/90 text-white"
                      >
                        Learn More
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="text-center mt-12">
          <Link href="/events">
            <Button
              variant="outline"
              className="border-gold text-gold hover:bg-gold hover:text-white"
            >
              View All Events
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
