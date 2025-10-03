"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MainLayout } from "@/components/layout/MainLayout";
import { eventsSeed, isUpcoming, isPast, isOngoing, type EventItem } from "@/lib/data/events";
import { motion } from "framer-motion";
import { Calendar, MapPin, Clock, Users } from "lucide-react";

type EventStatus = "all" | "upcoming" | "ongoing" | "past";

export default function EventsPage() {
  const [filteredEvents, setFilteredEvents] = useState<EventItem[]>(eventsSeed);
  const [selectedStatus, setSelectedStatus] = useState<EventStatus>("all");
  const [searchTerm, setSearchTerm] = useState("");

  // Filter events based on status and search term
  useEffect(() => {
    let result = [...eventsSeed];

    // Filter by status
    if (selectedStatus !== "all") {
      result = result.filter((event) => {
        if (selectedStatus === "upcoming") return isUpcoming(event);
        if (selectedStatus === "ongoing") return isOngoing(event);
        if (selectedStatus === "past") return isPast(event);
        return true;
      });
    }

    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (event) =>
          event.title.toLowerCase().includes(term) ||
          (event.description?.toLowerCase().includes(term) ?? false) ||
          (event.venue?.city?.toLowerCase().includes(term) ?? false) ||
          (event.venue?.country?.toLowerCase().includes(term) ?? false) ||
          (event.organizer?.toLowerCase().includes(term) ?? false)
      );
    }

    setFilteredEvents(result);
  }, [selectedStatus, searchTerm]);

  const getEventStatus = (event: EventItem) => {
    if (isUpcoming(event)) return { label: "Upcoming", color: "bg-green-500" };
    if (isOngoing(event)) return { label: "Ongoing", color: "bg-blue-500" };
    if (isPast(event)) return { label: "Past", color: "bg-gray-500" };
    return { label: "Scheduled", color: "bg-gold" };
  };

  const formatEventDate = (event: EventItem) => {
    const start = event.dateStart ? new Date(event.dateStart) : null;
    const end = event.dateEnd ? new Date(event.dateEnd) : null;

    if (!start) return "Date TBA";

    const options: Intl.DateTimeFormatOptions = {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    };

    const startStr = start.toLocaleDateString('en-US', options);
    if (end) {
      const endStr = end.toLocaleDateString('en-US', options);
      return `${startStr} - ${endStr}`;
    }
    return startStr;
  };

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-12">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="text-4xl font-bold mb-4">
            Upcoming <span className="text-gold">Events</span>
          </h1>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Discover live performances, workshops, and exclusive events featuring our talented artists
          </p>
        </motion.div>

        {/* Search Bar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="max-w-2xl mx-auto mb-8"
        >
          <input
            type="text"
            placeholder="Search events by name, location, or organizer..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold"
          />
        </motion.div>

        {/* Status Filter Tabs */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="flex flex-wrap justify-center gap-4 mb-8"
        >
          {(["all", "upcoming", "ongoing", "past"] as EventStatus[]).map((status) => (
            <button
              key={status}
              onClick={() => setSelectedStatus(status)}
              className={`px-6 py-2 rounded-full font-medium transition-all ${
                selectedStatus === status
                  ? "bg-gold text-white shadow-lg"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
              {status === "all" && ` (${eventsSeed.length})`}
              {status === "upcoming" && ` (${eventsSeed.filter(e => isUpcoming(e)).length})`}
              {status === "ongoing" && ` (${eventsSeed.filter(e => isOngoing(e)).length})`}
              {status === "past" && ` (${eventsSeed.filter(e => isPast(e)).length})`}
            </button>
          ))}
        </motion.div>

        {/* Events Grid */}
        {filteredEvents.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12"
          >
            <p className="text-gray-500 text-lg">No events found matching your criteria.</p>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {filteredEvents.map((event, index) => {
              const status = getEventStatus(event);
              return (
                <motion.div
                  key={event.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Link href={`/events/${event.id}`}>
                    <Card className="overflow-hidden hover:shadow-xl transition-shadow cursor-pointer h-full">
                      {/* Event Image */}
                      <div className="relative h-48 bg-gradient-to-br from-gold/20 to-gold/5">
                        {event.coverImage ? (
                          <Image
                            src={event.coverImage}
                            alt={event.title}
                            fill
                            className="object-cover"
                          />
                        ) : (
                          <div className="flex items-center justify-center h-full">
                            <Calendar className="w-16 h-16 text-gold/50" />
                          </div>
                        )}
                        <div className="absolute top-4 left-4">
                          <Badge className={`${status.color} text-white`}>
                            {status.label}
                          </Badge>
                        </div>
                        {event.category && (
                          <div className="absolute top-4 right-4">
                            <Badge variant="secondary" className="bg-white/90">
                              {event.category}
                            </Badge>
                          </div>
                        )}
                      </div>

                      {/* Event Details */}
                      <CardHeader>
                        <CardTitle className="line-clamp-2">{event.title}</CardTitle>
                        {event.description && (
                          <p className="text-sm text-gray-600 line-clamp-2 mt-2">
                            {event.description}
                          </p>
                        )}
                      </CardHeader>

                      <CardContent>
                        {/* Date and Time */}
                        <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                          <Clock className="w-4 h-4 text-gold" />
                          <span>{formatEventDate(event)}</span>
                        </div>

                        {/* Location */}
                        {event.venue && (
                          <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                            <MapPin className="w-4 h-4 text-gold" />
                            <span>
                              {event.venue.name && `${event.venue.name}, `}
                              {event.venue.city && `${event.venue.city}, `}
                              {event.venue.country}
                            </span>
                          </div>
                        )}

                        {/* Organizer */}
                        {event.organizer && (
                          <div className="flex items-center gap-2 text-sm text-gray-600 mb-3">
                            <Users className="w-4 h-4 text-gold" />
                            <span>{event.organizer}</span>
                          </div>
                        )}

                        {/* Price */}
                        {(event.priceFromGBP !== undefined || event.priceToGBP !== undefined) && (
                          <div className="flex items-center justify-between">
                            <span className="text-lg font-semibold text-gold">
                              {event.priceFromGBP === 0 ? (
                                "Free"
                              ) : (
                                <>
                                  {event.priceFromGBP && `£${event.priceFromGBP}`}
                                  {event.priceToGBP && ` - £${event.priceToGBP}`}
                                </>
                              )}
                            </span>
                            <span className="text-gold font-medium hover:underline">
                              View Details →
                            </span>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </Link>
                </motion.div>
              );
            })}
          </motion.div>
        )}

        {/* Call to Action */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="text-center mt-12 py-12 bg-gradient-to-r from-gold/10 to-transparent rounded-lg"
        >
          <h2 className="text-2xl font-bold mb-4">Want to Host an Event?</h2>
          <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
            Partner with VersaTalent to create unforgettable experiences featuring our exceptional artists
          </p>
          <Link
            href="/contact"
            className="inline-block bg-gold text-white px-8 py-3 rounded-lg font-semibold hover:bg-gold/90 transition-colors"
          >
            Get in Touch
          </Link>
        </motion.div>
      </div>
    </MainLayout>
  );
}
