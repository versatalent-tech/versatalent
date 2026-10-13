import Link from "next/link";
import { format } from "date-fns";
import { Clock, MapPin, Star } from "lucide-react";
import type { PublicEventBlock } from "@/lib/bookings/types";
import { whenLabel } from "./TalentBookingCard";

/** A VersaTalent event the talent appears at (from Admin → Events) */
export function TalentEventCard({ event }: { event: PublicEventBlock }) {
  return (
    <article className="space-y-3 rounded-xl border bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <h3 className="min-w-0 font-semibold">{event.title}</h3>
        <span className="flex flex-shrink-0 items-center gap-1 rounded-full bg-gold/15 px-2.5 py-0.5 text-xs font-medium text-black">
          <Star className="h-3 w-3" />
          Event
        </span>
      </div>
      <div className="space-y-1.5 text-sm text-gray-700">
        <p className="flex items-center gap-2">
          <Clock className="h-4 w-4 flex-shrink-0 text-gold" />
          {event.ends_at ? whenLabel({ starts_at: event.starts_at, ends_at: event.ends_at }) : format(new Date(event.starts_at), "EEE d MMM yyyy, HH:mm")}
        </p>
        {event.location && (
          <p className="flex items-center gap-2">
            <MapPin className="h-4 w-4 flex-shrink-0 text-gold" />
            {event.location}
          </p>
        )}
      </div>
      <Link href={`/events/${event.id}`} className="inline-block text-sm text-gray-600 underline hover:text-gold">
        Event page
      </Link>
    </article>
  );
}
