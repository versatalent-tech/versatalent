"use client";

import Link from "next/link";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { getFeaturedEvents, formatEventDate } from "@/lib/data/events";
import { getTalentById } from "@/lib/data/talents";
import { Calendar, MapPin, Clock, Users } from "lucide-react";

export function UpcomingEvents() {
  const events = getFeaturedEvents().slice(0, 3); // Show top 3 featured events

  // Debug: Always render, even if no events
  console.log('UpcomingEvents - Events found:', events.length);

  if (events.length === 0) {
    // Show debug info instead of returning null
    return (
      <section className="py-16 bg-red-50 border-4 border-red-500">
        <div className="container px-4 mx-auto text-center">
          <h2 className="text-2xl font-bold text-red-600 mb-4">
            DEBUG: No Upcoming Events Found
          </h2>
          <p className="text-red-500">
            Events array length: {getFeaturedEvents().length} |
            Current date: {new Date().toISOString()}
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="py-16 bg-white">
      <div className="container px-4 mx-auto">
        <div className="max-w-xl mx-auto text-center mb-16">
          <motion.h2
            className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            Upcoming <span className="text-gold">Events</span>
          </motion.h2>
          <motion.p
            className="mt-4 text-lg leading-8 text-gray-600"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            Don't miss these exciting events featuring our talented artists
          </motion.p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {events.map((event, index) => {
            const talent = getTalentById(event.talentIds[0]); // Get first talent for display

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

                  {talent && (
                    <p className="text-sm text-gold mb-3 font-medium">
                      Featuring {talent.name}
                    </p>
                  )}

                  <p className="text-gray-600 text-sm mb-4 line-clamp-2">
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
                        Expected: {event.expectedAttendance.toLocaleString()} attendees
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
                        Learn More
                      </Button>
                    </Link>
                  </div>
                </div>
              </motion.div>
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
