"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import type { TalentBooking } from "@/lib/portal/types";
import { api, errorMessage } from "@/components/crm/shared";
import { TalentBookingCard } from "@/components/portal/TalentBookingCard";
import { PortalCalendarLink } from "@/components/portal/PortalCalendarLink";

export default function PortalBookingsPage() {
  const [when, setWhen] = useState<"upcoming" | "past">("upcoming");
  const [bookings, setBookings] = useState<TalentBooking[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setBookings(null);
    api<TalentBooking[]>(`/api/portal/bookings?when=${when}`).then(setBookings).catch((err) => setError(errorMessage(err)));
  }, [when]);

  const replace = (updated: TalentBooking) => setBookings((list) => list?.map((b) => (b.id === updated.id ? updated : b)) ?? null);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Bookings</h1>
        <div className="flex rounded-md border bg-white p-0.5 text-sm">
          {(["upcoming", "past"] as const).map((value) => (
            <button key={value} onClick={() => setWhen(value)} className={`rounded px-3 py-1 capitalize ${when === value ? "bg-black text-white" : "text-gray-600"}`}>
              {value}
            </button>
          ))}
        </div>
      </div>
      {error && <p className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}
      {!bookings ? (
        <Loader2 className="mx-auto mt-10 h-8 w-8 animate-spin text-gold" />
      ) : bookings.length === 0 ? (
        <p className="rounded-xl border bg-white p-8 text-center text-sm text-gray-500">
          {when === "upcoming" ? "No bookings coming up yet." : "No past bookings yet."}
        </p>
      ) : (
        <div className="space-y-3">
          {bookings.map((b) => (
            <TalentBookingCard key={b.id} booking={b} onChanged={replace} />
          ))}
        </div>
      )}
      <PortalCalendarLink />
    </div>
  );
}
