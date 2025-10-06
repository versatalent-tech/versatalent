"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MainLayout } from "@/components/layout/MainLayout";
import { motion } from "framer-motion";
import { events, formatEventDate, EventType } from "@/lib/data/events";
import { getTalentById } from "@/lib/data/talents";
import { Calendar, MapPin, Clock, Users, Filter, Search } from "lucide-react";

const eventTypes: { value: EventType | 'all'; label: string }[] = [
  { value: 'all', label: 'All Events' },
  { value: 'performance', label: 'Performances' },
  { value: 'photoshoot', label: 'Photoshoots' },
  { value: 'match', label: 'Sports Matches' },
  { value: 'workshop', label: 'Workshops' },
  { value: 'appearance', label: 'Appearances' },
  { value: 'collaboration', label: 'Collaborations' }
];

export default function EventsPage() {
  const [selectedType, setSelectedType] = useState<EventType | 'all'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Filter events based on selected type and search term
  const filteredEvents = events.filter(event => {
    const matchesType = selectedType === 'all' || event.type === selectedType;
    const matchesSearch = event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         event.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         event.venue.city.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesType && matchesSearch;
  });

  // Sort events by date (upcoming first)
  const sortedEvents = filteredEvents.sort((a, b) => {
    const dateA = new Date(a.date);
    const dateB = new Date(b.date);
    return dateA.getTime() - dateB.getTime();
  });

  const upcomingEvents = sortedEvents.filter(event => event.status === 'upcoming');
  const completedEvents = sortedEvents.filter(event => event.status === 'completed');

  return (
    <MainLayout>
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-black via-gray-900 to-black py-20 md:py-32">
        <div className="container px-4 mx-auto text-center">
          <motion.h1
            className="text-4xl md:text-6xl font-bold text-white mb-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            VersaTalent <span className="text-gold">Events</span>
          </motion.h1>
          <motion.p
            className="text-xl md:text-2xl text-gray-300 max-w-3xl mx-auto mb-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            Discover upcoming performances, collaborations, and appearances featuring our exceptional talent
          </motion.p>
        </div>
      </section>

      {/* Filters and Search */}
      <section className="bg-gray-50 py-8 border-b">
        <div className="container px-4 mx-auto">
          <div className="flex flex-col lg:flex-row gap-6 items-center justify-between">
            {/* Search */}
            <div className="relative w-full lg:w-96">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <input
                type="text"
                placeholder="Search events..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold focus:border-transparent"
              />
            </div>

            {/* Event Type Filter */}
            <div className="flex items-center gap-2 flex-wrap">
              <Filter className="h-5 w-5 text-gray-600" />
              <span className="text-sm text-gray-600 mr-2">Filter by:</span>
              {eventTypes.map((type) => (
                <Button
                  key={type.value}
                  variant={selectedType === type.value ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedType(type.value)}
                  className={selectedType === type.value ? "bg-gold hover:bg-gold/90 text-white" : ""}
                >
                  {type.label}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Upcoming Events */}
      {upcomingEvents.length > 0 && (
        <section className="py-16 bg-white">
          <div className="container px-4 mx-auto">
            <h2 className="text-3xl font-bold text-foreground mb-8">
              Upcoming Events ({upcomingEvents.length})
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
              {upcomingEvents.map((event, index) => {
                const talent = getTalentById(event.talentIds[0]);

                return (
                  <motion.div
                    key={event.id}
                    className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden hover:shadow-xl transition-all duration-300"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: index * 0.1 }}
                    whileHover={{ y: -5 }}
                  >
                    <div className="relative h-48 w-full">
                      <Image
                        src={event.imageSrc}
                        alt={event.title}
                        fill
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                        quality={80}
                        className="object-cover"
                      />
                      <div className="absolute top-4 left-4">
                        <Badge className="bg-gold text-white border-none">
                          {event.type.charAt(0).toUpperCase() + event.type.slice(1)}
                        </Badge>
                      </div>
                      {event.featured && (
                        <div className="absolute top-4 right-4">
                          <Badge className="bg-red-600 text-white border-none">
                            Featured
                          </Badge>
                        </div>
                      )}
                    </div>

                    <div className="p-6">
                      <h3 className="text-xl font-semibold text-foreground mb-2 line-clamp-2">
                        {event.title}
                      </h3>

                      {talent && (
                        <p className="text-sm text-gold mb-3 font-medium">
                          Featuring {talent.name}
                        </p>
                      )}

                      <p className="text-gray-600 text-sm mb-4 line-clamp-3">
                        {event.description}
                      </p>

                      <div className="space-y-2 mb-4">
                        <div className="flex items-center text-sm text-gray-500">
                          <Calendar className="h-4 w-4 mr-2 text-gold" />
                          {formatEventDate(event.date)}
                        </div>

                        <div className="flex items-center text-sm text-gray-500">
                          <Clock className="h-4 w-4 mr-2 text-gold" />
                          {event.time}
                        </div>

                        <div className="flex items-center text-sm text-gray-500">
                          <MapPin className="h-4 w-4 mr-2 text-gold" />
                          {event.venue.name}, {event.venue.city}
                        </div>

                        {event.expectedAttendance && (
                          <div className="flex items-center text-sm text-gray-500">
                            <Users className="h-4 w-4 mr-2 text-gold" />
                            Expected: {event.expectedAttendance.toLocaleString()}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="text-sm">
                          {event.price?.isFree ? (
                            <span className="text-green-600 font-semibold">Free Event</span>
                          ) : (
                            <span className="text-gray-900 font-semibold">
                              From £{event.price?.min}
                              {event.price?.max && ` - £${event.price.max}`}
                            </span>
                          )}
                        </div>

                        <Link href={`/events/${event.id}`}>
                          <Button
                            size="sm"
                            className="bg-gold hover:bg-gold/90 text-white"
                          >
                            View Details
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* Past Events */}
      {completedEvents.length > 0 && (
        <section className="py-16 bg-gray-50">
          <div className="container px-4 mx-auto">
            <h2 className="text-3xl font-bold text-foreground mb-8">
              Past Events ({completedEvents.length})
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
              {completedEvents.map((event, index) => {
                const talent = getTalentById(event.talentIds[0]);

                return (
                  <motion.div
                    key={event.id}
                    className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: index * 0.05 }}
                  >
                    <div className="relative h-32 w-full">
                      <Image
                        src={event.imageSrc}
                        alt={event.title}
                        fill
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
                        quality={60}
                        className="object-cover opacity-75"
                      />
                    </div>

                    <div className="p-4">
                      <h4 className="font-semibold text-foreground mb-1 line-clamp-1 text-sm">
                        {event.title}
                      </h4>

                      {talent && (
                        <p className="text-xs text-gold mb-2 font-medium">
                          {talent.name}
                        </p>
                      )}

                      <div className="flex items-center text-xs text-gray-500 mb-2">
                        <Calendar className="h-3 w-3 mr-1" />
                        {formatEventDate(event.date)}
                      </div>

                      <div className="flex items-center text-xs text-gray-500">
                        <MapPin className="h-3 w-3 mr-1" />
                        {event.venue.city}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* No Events Found */}
      {filteredEvents.length === 0 && (
        <section className="py-16 bg-white">
          <div className="container px-4 mx-auto text-center">
            <h3 className="text-2xl font-semibold text-gray-900 mb-4">No events found</h3>
            <p className="text-gray-600 mb-6">
              Try adjusting your search or filter criteria
            </p>
            <Button
              onClick={() => {
                setSelectedType('all');
                setSearchTerm('');
              }}
              className="bg-gold hover:bg-gold/90 text-white"
            >
              Clear Filters
            </Button>
          </div>
        </section>
      )}

      {/* CTA Section */}
      <section className="py-16 bg-gold text-white">
        <div className="container px-4 mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">Want to book our talent for your event?</h2>
          <p className="text-xl mb-8 opacity-90 max-w-2xl mx-auto">
            Our artists are available for private events, collaborations, and custom performances.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/contact">
              <Button className="bg-white text-gold hover:bg-gray-100">
                Contact Us
              </Button>
            </Link>
            <Link href="/for-brands">
              <Button variant="outline" className="border-white text-white hover:bg-white hover:text-gold">
                Book Our Talent
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </MainLayout>
  );
}
