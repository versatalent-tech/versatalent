"use client";

import { useState } from "react";
import { format, isSameDay } from "date-fns";
import { Check, Clock, Loader2, MapPin, Phone, User, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BOOKING_STATUSES } from "@/lib/bookings/types";
import type { TalentBooking } from "@/lib/portal/types";
import { formatMoney } from "@/components/crm/shared";

const STATUS_STYLES = {
  hold: "bg-amber-100 text-amber-900",
  confirmed: "bg-green-100 text-green-800",
  completed: "bg-gray-100 text-gray-700",
  cancelled: "bg-gray-100 text-gray-400 line-through",
} as const;

export function whenLabel(b: Pick<TalentBooking, "starts_at" | "ends_at">): string {
  const start = new Date(b.starts_at);
  const end = new Date(b.ends_at);
  return isSameDay(start, end) || end.getTime() - start.getTime() < 12 * 60 * 60 * 1000
    ? `${format(start, "EEE d MMM yyyy, HH:mm")}–${format(end, "HH:mm")}`
    : `${format(start, "EEE d MMM, HH:mm")} – ${format(end, "EEE d MMM, HH:mm")}`;
}

/** One booking as the talent sees it, with Accept / Decline while it's open */
export function TalentBookingCard({
  booking,
  onChanged,
  detailed = true,
}: {
  booking: TalentBooking;
  onChanged?: (b: TalentBooking) => void;
  detailed?: boolean;
}) {
  const [busy, setBusy] = useState<"accepted" | "declined" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const respond = async (response: "accepted" | "declined") => {
    let note: string | null = null;
    if (response === "declined") {
      note = window.prompt("Let the team know why (optional)") ?? null;
    }
    setBusy(response);
    setError(null);
    try {
      const res = await fetch(`/api/portal/bookings/${booking.id}/respond`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ response, note }),
      });
      const body = await res.json();
      if (!body.success) throw new Error(body.error);
      onChanged?.(body.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save your answer");
    } finally {
      setBusy(null);
    }
  };

  return (
    <article className="space-y-3 rounded-xl border bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className={`font-semibold ${booking.status === "cancelled" ? "text-gray-400 line-through" : ""}`}>{booking.title}</h3>
          {booking.client_name && <p className="text-sm text-gray-500">{booking.client_name}</p>}
        </div>
        <span className={`flex-shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLES[booking.status]}`}>
          {BOOKING_STATUSES[booking.status]}
        </span>
      </div>

      <div className="space-y-1.5 text-sm text-gray-700">
        <p className="flex items-center gap-2">
          <Clock className="h-4 w-4 flex-shrink-0 text-gold" />
          {whenLabel(booking)}
        </p>
        {booking.location && (
          <p className="flex items-center gap-2">
            <MapPin className="h-4 w-4 flex-shrink-0 text-gold" />
            {booking.location}
          </p>
        )}
        {booking.call_time && (
          <p className="pl-6">
            <span className="font-medium">Call time:</span> {booking.call_time}
          </p>
        )}
        {detailed && (booking.onsite_contact.name || booking.onsite_contact.phone) && (
          <p className="flex items-center gap-2">
            <User className="h-4 w-4 flex-shrink-0 text-gold" />
            {booking.onsite_contact.name}
            {booking.onsite_contact.phone && (
              <a href={`tel:${booking.onsite_contact.phone}`} className="inline-flex items-center gap-1 text-gold underline">
                <Phone className="h-3.5 w-3.5" />
                {booking.onsite_contact.phone}
              </a>
            )}
          </p>
        )}
        {detailed && booking.brief && <p className="whitespace-pre-wrap rounded bg-gray-50 p-2 text-gray-600">{booking.brief}</p>}
        {detailed && booking.logistics_notes && (
          <p className="whitespace-pre-wrap rounded bg-gray-50 p-2 text-gray-600">
            <span className="font-medium">Logistics:</span> {booking.logistics_notes}
          </p>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-3">
        <p className="text-sm">
          {booking.net_cents != null ? (
            <>
              {booking.payout === "paid" ? "You received" : "You receive"}{" "}
              <span className="font-semibold">{formatMoney(booking.payout === "paid" ? booking.paid_cents : booking.net_cents, booking.currency)}</span>
            </>
          ) : (
            <span className="text-gray-400">Fee to be confirmed</span>
          )}
        </p>
        {booking.can_respond && booking.talent_response === "pending" ? (
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => respond("declined")} disabled={busy !== null}>
              {busy === "declined" ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <X className="mr-1 h-4 w-4" />}
              Can&apos;t do it
            </Button>
            <Button size="sm" onClick={() => respond("accepted")} disabled={busy !== null} className="bg-gold text-black hover:bg-gold/90">
              {busy === "accepted" ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Check className="mr-1 h-4 w-4" />}
              I&apos;m in
            </Button>
          </div>
        ) : booking.payout === "paid" ? (
          <span className="text-xs font-medium text-green-700">Paid {booking.paid_at ? format(new Date(booking.paid_at), "d MMM") : ""}</span>
        ) : booking.payout === "owed" ? (
          <span className="text-xs font-medium text-amber-700">Payment due</span>
        ) : booking.talent_response !== "pending" ? (
          <span className={`text-xs font-medium ${booking.talent_response === "accepted" ? "text-green-700" : "text-red-700"}`}>
            {booking.talent_response === "accepted" ? "You accepted" : "You declined"}
          </span>
        ) : null}
      </div>
      {error && <p className="text-sm text-red-700">{error}</p>}
    </article>
  );
}
