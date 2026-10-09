"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CalendarDays, ChevronRight, Loader2, MapPin, Nfc, Users } from "lucide-react";
import type { EventDayEvent } from "@/lib/db/repositories/event-day";

function formatEventDate(event: EventDayEvent) {
  const date = new Date(event.start_time).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "Europe/London",
  });
  const time = event.display_time || new Date(event.start_time).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/London",
  });
  return `${date} · ${time}`;
}

/**
 * Event picker for the door: lists events with check-ins enabled, today's first.
 */
export default function EventDayPickerPage() {
  const [events, setEvents] = useState<EventDayEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/staff/event-day", { credentials: "include" })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Failed to load events");
        setEvents(data);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load events"))
      .finally(() => setLoading(false));
  }, []);

  const today = events.filter((e) => e.is_today);
  const later = events.filter((e) => !e.is_today);

  return (
    <main className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black text-white">
      <div className="mx-auto max-w-3xl px-4 py-10">
        <div className="mb-8 flex items-center gap-3">
          <Nfc className="h-8 w-8 text-gold" />
          <div>
            <h1 className="text-3xl font-bold">Event Day Check-in</h1>
            <p className="text-gray-400">Choose the event you&apos;re running the door for</p>
          </div>
          <Link href="/staff/rewards" className="ml-auto rounded-md border border-gold/60 px-3 py-2 text-sm text-gold hover:bg-gold/10">
            Rewards
          </Link>
        </div>

        {loading && (
          <div className="flex items-center gap-2 text-gray-400">
            <Loader2 className="h-5 w-5 animate-spin" /> Loading events…
          </div>
        )}

        {error && (
          <div className="rounded-lg border border-red-500/40 bg-red-500/10 p-4 text-red-300">{error}</div>
        )}

        {!loading && !error && events.length === 0 && (
          <div className="rounded-lg border border-white/10 bg-white/5 p-6 text-gray-300">
            No events have check-ins enabled. An admin can enable them from{" "}
            <span className="text-gold">Admin → Events → Enable Check-ins</span>.
          </div>
        )}

        {[
          { label: "Today", items: today },
          { label: "Upcoming", items: later },
        ].map(({ label, items }) =>
          items.length === 0 ? null : (
            <section key={label} className="mb-8">
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-400">{label}</h2>
              <div className="space-y-3">
                {items.map((event) => (
                  <Link
                    key={event.id}
                    href={`/staff/event-day/${event.id}`}
                    className={`group flex items-center gap-4 rounded-xl border p-4 transition-colors ${
                      event.is_today
                        ? "border-gold/50 bg-gold/10 hover:bg-gold/20"
                        : "border-white/10 bg-white/5 hover:bg-white/10"
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-lg font-semibold">{event.title}</div>
                      <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-400">
                        <span className="flex items-center gap-1">
                          <CalendarDays className="h-4 w-4" /> {formatEventDate(event)}
                        </span>
                        {event.venue?.name && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-4 w-4" /> {event.venue.name}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Users className="h-4 w-4" /> {event.unique_attendees} checked in
                        </span>
                      </div>
                    </div>
                    <ChevronRight className="h-6 w-6 text-gray-500 transition-transform group-hover:translate-x-1 group-hover:text-gold" />
                  </Link>
                ))}
              </div>
            </section>
          )
        )}
      </div>
    </main>
  );
}
