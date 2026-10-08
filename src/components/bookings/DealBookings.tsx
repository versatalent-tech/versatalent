"use client";

import { useCallback, useEffect, useState } from "react";
import { format } from "date-fns";
import { CalendarPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BOOKING_STATUSES, type Booking } from "@/lib/bookings/types";
import type { Deal } from "@/lib/crm/types";
import { api, formatMoney } from "@/components/crm/shared";
import { BookingDialog, type BookingOptions } from "./BookingDialog";

/** Bookings made from a deal, with a shortcut to add one prefilled from it */
export function DealBookings({ deal }: { deal: Deal }) {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [options, setOptions] = useState<BookingOptions | null>(null);
  const [editing, setEditing] = useState<Booking | null | "new">(null);

  const load = useCallback(() => {
    api<Booking[]>(`/api/bookings?dealId=${deal.id}`).then(setBookings).catch(() => undefined);
  }, [deal.id]);

  useEffect(() => {
    load();
    api<BookingOptions>("/api/bookings/options").then(setOptions).catch(() => undefined);
  }, [load]);

  const onlyTalent = deal.talents.length === 1 ? deal.talents[0].id : undefined;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Bookings</CardTitle>
        {options?.can.edit && (
          <Button size="sm" variant="outline" onClick={() => setEditing("new")}>
            <CalendarPlus className="mr-1 h-4 w-4" />
            Add
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {bookings.length === 0 ? (
          <p className="text-sm text-gray-500">
            {deal.stage === "won" ? "Won: add the booking to put it in the calendar." : "No bookings yet."}
          </p>
        ) : (
          <ul className="space-y-3">
            {bookings.map((b) => (
              <li key={b.id}>
                <button onClick={() => setEditing(b)} className="w-full text-left hover:text-gold">
                  <p className="text-sm font-medium">
                    {b.talent.name}: {format(new Date(b.starts_at), "EEE d MMM, HH:mm")}
                  </p>
                  <p className="text-xs text-gray-500">
                    {BOOKING_STATUSES[b.status]}
                    {b.money?.fee_cents != null ? ` · ${formatMoney(b.money.fee_cents, b.money.currency)}` : ""}
                    {b.location ? ` · ${b.location}` : ""}
                  </p>
                </button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>

      {options && editing !== null && (
        <BookingDialog
          open
          onOpenChange={(open) => !open && setEditing(null)}
          booking={editing === "new" ? null : editing}
          defaults={{
            dealId: deal.id,
            talentId: onlyTalent,
            title: deal.title,
            // With one talent the deal value is their fee; with several, split it by hand
            feeCents: onlyTalent ? deal.value_cents : null,
          }}
          options={options}
          onSaved={load}
        />
      )}
    </Card>
  );
}
