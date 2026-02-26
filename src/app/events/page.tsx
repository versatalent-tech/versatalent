"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { MainLayout } from "@/components/layout/MainLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, MapPin, Clock, Users, Search, Filter } from "lucide-react";
import type { Event } from "@/lib/db/types";
import type { Talent } from "@/lib/data/talents";

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

export default function EventsPage() {
  const [upcomingEvents, setUpcomingEvents] = useState<Event[]>([]);
  const [pastEvents, setPastEvents] = useState<Event[]>([]);
  const [talents, setTalents] = useState<Map<string, Talent>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [showPastEvents, setShowPastEvents] = useState(false);

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch upcoming events, past events, and talents in parallel
      const [upcomingRes, pastRes, talentsRes] = await Promise.all([
        fetch('/api/events?status=upcoming'),
        fetch('/api/events?status=past'),
        fetch('/api/talents')
      ]);

      if (!upcomingRes.ok || !pastRes.ok || !talentsRes.ok) {
        throw new Error('Failed to fetch events');
      }

      const upcomingData = await upcomingRes.json();
      const pastData = await pastRes.json();
      const talentsData = await talentsRes.json();

      // Create talent map for quick lookup
      const talentMap = new Map<string, Talent>();
      talentsData.forEach((talent: Talent) => {
        talentMap.set(talent.id, talent);
      });
      setTalents(talentMap);

      setUpcomingEvents(upcomingData);
      setPastEvents(pastData);
    } catch (err) {
      console.error('Error fetching events:', err);
      setError('Failed to load events. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const filteredUpcomingEvents = upcomingEvents.filter(event =>
    event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    event.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    event.venue.city.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredPastEvents = pastEvents.filter(event =>
    event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    event.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    event.venue.city.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const EventCard = ({ event }: { event: Event }) => {
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
      <div className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden hover:shadow-xl transition-all duration-300">
        <div className="relative h-48 w-full">
          <Image
            src={event.image_url || 'https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?w=800'}
            alt={event.title}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            quality={75}
            className="object-cover"
          />
          <div className="absolute top-4 left-4 flex gap-2">
            <Badge className="bg-gold text-white border-none">
              {event.type.charAt(0).toUpperCase() + event.type.slice(1)}
            </Badge>
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
              <Button size="sm" className="bg-gold hover:bg-gold/90 text-white">
                Learn More
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  };

  return (
    <MainLayout>
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-black via-gray-900 to-black py-16 md:py-24">
        <div className="container px-4 mx-auto text-center">
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-4">
            Events & <span className="text-gold">Performances</span>
          </h1>
          <p className="text-xl text-gray-300 max-w-2xl mx-auto">
            Discover our talent in action at upcoming events and performances
          </p>
        </div>
      </section>

      {/* Search and Filter */}
      <section className="py-8 bg-gray-50 border-b">
        <div className="container px-4 mx-auto">
          <div className="max-w-md mx-auto">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <input
                type="text"
                placeholder="Search events..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold focus:border-transparent"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Content */}
      <section className="py-12">
        <div className="container px-4 mx-auto">
          {loading ? (
            <div className="text-center py-12">
              <p className="text-gray-600">Loading events...</p>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <p className="text-red-600 mb-4">{error}</p>
              <Button onClick={fetchEvents} variant="outline">
                Try Again
              </Button>
            </div>
          ) : (
            <>
              {/* Upcoming Events */}
              <div className="mb-16">
                <h2 className="text-3xl font-bold text-foreground mb-8">
                  Upcoming <span className="text-gold">Events</span>
                </h2>
                {filteredUpcomingEvents.length === 0 ? (
                  <div className="text-center py-12 bg-gray-50 rounded-lg">
                    <Calendar className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-600">No upcoming events found</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {filteredUpcomingEvents.map((event) => (
                      <EventCard key={event.id} event={event} />
                    ))}
                  </div>
                )}
              </div>

              {/* Past Events */}
              <div>
                <div className="flex items-center justify-between mb-8">
                  <h2 className="text-3xl font-bold text-foreground">
                    Past <span className="text-gold">Events</span>
                  </h2>
                  <Button
                    onClick={() => setShowPastEvents(!showPastEvents)}
                    variant="outline"
                    className="border-gold text-gold hover:bg-gold hover:text-white"
                  >
                    {showPastEvents ? 'Hide Past Events' : 'Show Past Events'}
                  </Button>
                </div>

                {showPastEvents && (
                  <>
                    {filteredPastEvents.length === 0 ? (
                      <div className="text-center py-12 bg-gray-50 rounded-lg">
                        <Calendar className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                        <p className="text-gray-600">No past events found</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {filteredPastEvents.map((event) => (
                          <EventCard key={event.id} event={event} />
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </section>
    </MainLayout>
  );
}
