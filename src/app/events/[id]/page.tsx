"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MainLayout } from "@/components/layout/MainLayout";
import { motion } from "framer-motion";
import { getEventById, formatEventDate, getEventsByType } from "@/lib/data/events";
import { getTalentById } from "@/lib/data/talents";
import {
  Calendar,
  MapPin,
  Clock,
  Users,
  ExternalLink,
  Ticket,
  ArrowLeft,
  Share2,
  Globe,
  Phone,
  Mail
} from "lucide-react";

export default function EventDetailPage() {
  const params = useParams();
  const eventId = params.id as string;
  const event = getEventById(eventId);

  if (!event) {
    return (
      <MainLayout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Event Not Found</h1>
            <p className="text-gray-600 mb-6">The event you're looking for doesn't exist.</p>
            <Link href="/events">
              <Button className="bg-gold hover:bg-gold/90 text-white">
                Back to Events
              </Button>
            </Link>
          </div>
        </div>
      </MainLayout>
    );
  }

  const talent = getTalentById(event.talentIds[0]);
  const relatedEvents = getEventsByType(event.type).filter(e => e.id !== event.id).slice(0, 3);

  return (
    <MainLayout>
      {/* Hero Section */}
      <section className="relative bg-black">
        <div className="absolute inset-0">
          <Image
            src={event.imageSrc}
            alt={event.title}
            fill
            quality={90}
            className="object-cover opacity-40"
            priority
          />
        </div>

        <div className="relative z-10 container px-4 mx-auto py-32">
          <motion.div
            className="max-w-4xl"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <Link
              href="/events"
              className="inline-flex items-center text-white/80 hover:text-white mb-6 transition-colors"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Events
            </Link>

            <div className="flex flex-wrap gap-2 mb-4">
              <Badge className="bg-gold text-white border-none text-sm">
                {event.type.charAt(0).toUpperCase() + event.type.slice(1)}
              </Badge>
              <Badge className={`text-white border-none text-sm ${
                event.status === 'upcoming' ? 'bg-green-600' :
                event.status === 'ongoing' ? 'bg-blue-600' : 'bg-gray-600'
              }`}>
                {event.status.charAt(0).toUpperCase() + event.status.slice(1)}
              </Badge>
              {event.featured && (
                <Badge className="bg-red-600 text-white border-none text-sm">
                  Featured Event
                </Badge>
              )}
            </div>

            <h1 className="text-4xl md:text-6xl font-bold text-white mb-6">
              {event.title}
            </h1>

            {talent && (
              <p className="text-xl text-gold mb-4">
                Featuring {talent.name}
              </p>
            )}

            <p className="text-xl text-white/90 max-w-3xl leading-relaxed">
              {event.description}
            </p>
          </motion.div>
        </div>
      </section>

      {/* Event Details */}
      <section className="py-16 bg-white">
        <div className="container px-4 mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
            {/* Main Content */}
            <div className="lg:col-span-2">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
              >
                <h2 className="text-3xl font-bold text-foreground mb-6">Event Details</h2>

                <div className="bg-gray-50 rounded-lg p-6 mb-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="flex items-center">
                      <Calendar className="h-6 w-6 text-gold mr-3" />
                      <div>
                        <p className="text-sm text-gray-500">Date</p>
                        <p className="font-semibold text-foreground">{formatEventDate(event.date)}</p>
                      </div>
                    </div>

                    <div className="flex items-center">
                      <Clock className="h-6 w-6 text-gold mr-3" />
                      <div>
                        <p className="text-sm text-gray-500">Time</p>
                        <p className="font-semibold text-foreground">{event.time}</p>
                      </div>
                    </div>

                    <div className="flex items-center">
                      <MapPin className="h-6 w-6 text-gold mr-3" />
                      <div>
                        <p className="text-sm text-gray-500">Venue</p>
                        <p className="font-semibold text-foreground">{event.venue.name}</p>
                        <p className="text-sm text-gray-600">
                          {event.venue.address}, {event.venue.city}, {event.venue.country}
                        </p>
                      </div>
                    </div>

                    {event.expectedAttendance && (
                      <div className="flex items-center">
                        <Users className="h-6 w-6 text-gold mr-3" />
                        <div>
                          <p className="text-sm text-gray-500">Expected Attendance</p>
                          <p className="font-semibold text-foreground">
                            {event.expectedAttendance.toLocaleString()} people
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Organizer Info */}
                {event.organizer && (
                  <div className="mb-8">
                    <h3 className="text-xl font-semibold text-foreground mb-4">Organized by</h3>
                    <p className="text-gray-600">{event.organizer}</p>
                  </div>
                )}

                {/* Tags */}
                {event.tags.length > 0 && (
                  <div className="mb-8">
                    <h3 className="text-xl font-semibold text-foreground mb-4">Tags</h3>
                    <div className="flex flex-wrap gap-2">
                      {event.tags.map((tag, index) => (
                        <Badge key={index} variant="outline" className="border-gold text-gold">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            </div>

            {/* Sidebar */}
            <div className="lg:col-span-1">
              <motion.div
                className="sticky top-8"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
              >
                {/* Pricing */}
                <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6 shadow-sm">
                  <h3 className="text-xl font-semibold text-foreground mb-4">Pricing</h3>

                  {event.price?.isFree ? (
                    <div className="text-2xl font-bold text-green-600 mb-4">
                      Free Event
                    </div>
                  ) : (
                    <div className="mb-4">
                      <div className="text-2xl font-bold text-foreground">
                        £{event.price?.min}
                        {event.price?.max && event.price.max !== event.price.min && (
                          <span className="text-lg text-gray-500"> - £{event.price.max}</span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500">
                        {event.price?.currency} per ticket
                      </p>
                    </div>
                  )}

                  {event.ticketsUrl && event.status === 'upcoming' && (
                    <a href={event.ticketsUrl} target="_blank" rel="noopener noreferrer">
                      <Button className="w-full bg-gold hover:bg-gold/90 text-white">
                        <Ticket className="h-4 w-4 mr-2" />
                        Get Tickets
                        <ExternalLink className="h-4 w-4 ml-2" />
                      </Button>
                    </a>
                  )}
                </div>

                {/* Venue Details */}
                <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6 shadow-sm">
                  <h3 className="text-xl font-semibold text-foreground mb-4">Venue Information</h3>

                  <div className="space-y-3">
                    <div>
                      <p className="font-semibold text-foreground">{event.venue.name}</p>
                      <p className="text-sm text-gray-600">
                        {event.venue.address}<br />
                        {event.venue.city}, {event.venue.country}
                      </p>
                    </div>

                    {event.venue.capacity && (
                      <div>
                        <p className="text-sm text-gray-500">Capacity</p>
                        <p className="font-semibold text-foreground">
                          {event.venue.capacity.toLocaleString()} people
                        </p>
                      </div>
                    )}

                    {event.venue.website && (
                      <a
                        href={event.venue.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center text-gold hover:underline text-sm"
                      >
                        <Globe className="h-4 w-4 mr-1" />
                        Visit Venue Website
                        <ExternalLink className="h-4 w-4 ml-1" />
                      </a>
                    )}
                  </div>
                </div>

                {/* Share */}
                <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
                  <h3 className="text-xl font-semibold text-foreground mb-4">Share Event</h3>

                  <Button
                    variant="outline"
                    className="w-full border-gold text-gold hover:bg-gold hover:text-white"
                    onClick={() => {
                      if (navigator.share) {
                        navigator.share({
                          title: event.title,
                          text: event.description,
                          url: window.location.href,
                        });
                      } else {
                        navigator.clipboard.writeText(window.location.href);
                        alert('Link copied to clipboard!');
                      }
                    }}
                  >
                    <Share2 className="h-4 w-4 mr-2" />
                    Share Event
                  </Button>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Talent */}
      {talent && (
        <section className="py-16 bg-gray-50">
          <div className="container px-4 mx-auto">
            <h2 className="text-3xl font-bold text-foreground mb-8">Featured Talent</h2>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex flex-col md:flex-row gap-6">
                <div className="relative w-full md:w-48 h-48 rounded-lg overflow-hidden">
                  <Image
                    src={talent.imageSrc}
                    alt={talent.name}
                    fill
                    className="object-cover"
                  />
                </div>

                <div className="flex-1">
                  <h3 className="text-2xl font-semibold text-foreground mb-2">{talent.name}</h3>
                  <p className="text-gold font-medium mb-3">{talent.profession}</p>
                  <p className="text-gray-600 mb-4 line-clamp-3">{talent.bio}</p>

                  <Link href={`/talents/${talent.id}`}>
                    <Button variant="outline" className="border-gold text-gold hover:bg-gold hover:text-white">
                      View Full Profile
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Related Events */}
      {relatedEvents.length > 0 && (
        <section className="py-16 bg-white">
          <div className="container px-4 mx-auto">
            <h2 className="text-3xl font-bold text-foreground mb-8">
              More {event.type} Events
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {relatedEvents.map((relatedEvent) => {
                const relatedTalent = getTalentById(relatedEvent.talentIds[0]);

                return (
                  <Link key={relatedEvent.id} href={`/events/${relatedEvent.id}`}>
                    <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow">
                      <div className="relative h-32 w-full">
                        <Image
                          src={relatedEvent.imageSrc}
                          alt={relatedEvent.title}
                          fill
                          className="object-cover"
                        />
                      </div>

                      <div className="p-4">
                        <h4 className="font-semibold text-foreground mb-1 line-clamp-1">
                          {relatedEvent.title}
                        </h4>

                        {relatedTalent && (
                          <p className="text-sm text-gold mb-2">
                            {relatedTalent.name}
                          </p>
                        )}

                        <p className="text-xs text-gray-500">
                          {formatEventDate(relatedEvent.date)}
                        </p>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* Contact CTA */}
      <section className="py-16 bg-gold text-white">
        <div className="container px-4 mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">Interested in booking our talent?</h2>
          <p className="text-xl mb-8 opacity-90 max-w-2xl mx-auto">
            Contact us to discuss custom events, private performances, and collaboration opportunities.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/contact">
              <Button className="bg-white text-gold hover:bg-gray-100">
                <Mail className="h-4 w-4 mr-2" />
                Get in Touch
              </Button>
            </Link>
            <a href="tel:+1234567890">
              <Button variant="outline" className="border-white text-white hover:bg-white hover:text-gold">
                <Phone className="h-4 w-4 mr-2" />
                Call Us
              </Button>
            </a>
          </div>
        </div>
      </section>
    </MainLayout>
  );
}
