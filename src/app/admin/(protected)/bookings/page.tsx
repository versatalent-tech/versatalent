"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  addDays,
  addMonths,
  addWeeks,
  differenceInCalendarDays,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { CalendarPlus, ChevronLeft, ChevronRight, Loader2, Percent, Plus, Rss, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SimpleMainLayout } from "@/components/layout/SimpleMainLayout";
import { AdminBackLink } from "@/components/admin/AdminBackLink";
import { BOOKING_STATUSES, type Availability, type Booking, type BookingStatus, type CalendarData, type PublicEventBlock } from "@/lib/bookings/types";
import { api, errorMessage, formatMoney, selectClass } from "@/components/crm/shared";
import { BookingDialog, type BookingDefaults, type BookingOptions } from "@/components/bookings/BookingDialog";
import { AvailabilityDialog, CalendarFeedDialog } from "@/components/bookings/CalendarDialogs";

type View = "month" | "week" | "list";

const STATUS_STYLES: Record<BookingStatus, string> = {
  hold: "border-amber-300 bg-amber-50 text-amber-900 border-dashed",
  confirmed: "border-green-300 bg-green-50 text-green-900",
  completed: "border-gray-200 bg-gray-50 text-gray-600",
  cancelled: "border-gray-200 bg-white text-gray-400 line-through",
};

const WEEK = { weekStartsOn: 1 as const };
const dayKey = (d: Date) => format(d, "yyyy-MM-dd");

/** The calendar days a booking appears on (an overnight set doesn't spill into the next morning) */
function bookingDays(booking: Booking): string[] {
  const start = new Date(booking.starts_at);
  const end = new Date(booking.ends_at);
  const lastDay = end.getHours() < 6 && !isSameDay(start, end) ? addDays(end, -1) : end;
  return eachDayOfInterval({ start: startOfDay(start), end: startOfDay(lastDay < start ? start : lastDay) }).map(dayKey);
}

function availabilityDays(a: Availability): string[] {
  return eachDayOfInterval({ start: new Date(`${a.starts_on}T00:00:00`), end: new Date(`${a.ends_on}T00:00:00`) }).map(dayKey);
}

function rangeFor(view: View, cursor: Date): { start: Date; end: Date } {
  if (view === "week") return { start: startOfWeek(cursor, WEEK), end: endOfWeek(cursor, WEEK) };
  if (view === "list") return { start: startOfDay(cursor), end: addDays(startOfDay(cursor), 60) };
  return { start: startOfWeek(startOfMonth(cursor), WEEK), end: endOfWeek(endOfMonth(cursor), WEEK) };
}

function BookingChip({
  booking,
  showTalent,
  onOpen,
  draggable,
}: {
  booking: Booking;
  showTalent: boolean;
  onOpen: (b: Booking) => void;
  draggable: boolean;
}) {
  return (
    <button
      type="button"
      draggable={draggable}
      onDragStart={(e) => e.dataTransfer.setData("text/booking", booking.id)}
      onClick={(e) => {
        e.stopPropagation();
        onOpen(booking);
      }}
      className={`block w-full truncate rounded border px-1.5 py-0.5 text-left text-xs ${STATUS_STYLES[booking.status]}`}
      title={`${booking.talent.name}: ${booking.title} (${BOOKING_STATUSES[booking.status]})`}
    >
      <span className="font-medium">{format(new Date(booking.starts_at), "HH:mm")}</span>{" "}
      {showTalent ? `${booking.talent.name.split(" ")[0]} · ` : ""}
      {booking.title}
    </button>
  );
}

export default function BookingsCalendarPage() {
  const [options, setOptions] = useState<BookingOptions | null>(null);
  const [view, setView] = useState<View>("month");
  const [cursor, setCursor] = useState(() => new Date());
  const [talentId, setTalentId] = useState("");
  const [data, setData] = useState<CalendarData>({ bookings: [], availability: [], events: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showEvents, setShowEvents] = useState(true);

  const [editing, setEditing] = useState<{ booking: Booking | null; defaults: BookingDefaults } | null>(null);
  const [availabilityDay, setAvailabilityDay] = useState<string | null>(null);
  const [feedOpen, setFeedOpen] = useState(false);

  useEffect(() => {
    api<BookingOptions>("/api/bookings/options").then(setOptions).catch((err) => setError(errorMessage(err)));
  }, []);

  const range = useMemo(() => rangeFor(view, cursor), [view, cursor]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ from: range.start.toISOString(), to: addDays(range.end, 1).toISOString() });
      if (talentId) params.set("talentId", talentId);
      setData(await api<CalendarData>(`/api/bookings?${params}`));
      setError(null);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [range, talentId]);

  useEffect(() => {
    load();
  }, [load]);

  const byDay = useMemo(() => {
    const bookings = new Map<string, Booking[]>();
    const unavailable = new Map<string, Availability[]>();
    const events = new Map<string, PublicEventBlock[]>();
    for (const b of data.bookings) for (const d of bookingDays(b)) bookings.set(d, [...(bookings.get(d) ?? []), b]);
    for (const a of data.availability) for (const d of availabilityDays(a)) unavailable.set(d, [...(unavailable.get(d) ?? []), a]);
    for (const e of data.events) {
      const d = dayKey(new Date(e.starts_at));
      events.set(d, [...(events.get(d) ?? []), e]);
    }
    return { bookings, unavailable, events };
  }, [data]);

  const showTalent = !talentId && (options?.talents.length ?? 0) > 1;
  const canEdit = options?.can.edit ?? false;

  const openBooking = (booking: Booking) => setEditing({ booking, defaults: {} });
  const newBooking = (day?: Date) => {
    if (!canEdit) return;
    const start = day ? new Date(day) : undefined;
    start?.setHours(19, 0, 0, 0);
    setEditing({ booking: null, defaults: { startsAt: start, talentId: talentId || undefined } });
  };

  /** Drop a booking on another day: same times, new date */
  const moveToDay = async (bookingId: string, day: Date) => {
    const booking = data.bookings.find((b) => b.id === bookingId);
    if (!booking || !canEdit) return;
    const shift = differenceInCalendarDays(day, new Date(booking.starts_at));
    if (shift === 0) return;
    const move = (iso: string) => addDays(new Date(iso), shift).toISOString();
    const send = (force: boolean) =>
      fetch(`/api/bookings/${booking.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ starts_at: move(booking.starts_at), ends_at: move(booking.ends_at), ...(force ? { force } : {}) }),
      }).then(async (r) => ({ status: r.status, body: await r.json() }));

    let result = await send(false);
    if (result.status === 409 && result.body.code === "CLASH") {
      const list = result.body.clashes.map((c: { label: string }) => `• ${c.label}`).join("\n");
      if (!window.confirm(`Moving “${booking.title}” clashes with:\n${list}\n\nMove it anyway?`)) return;
      result = await send(true);
    }
    if (!result.body.success) setError(result.body.error);
    load();
  };

  const removeAvailability = async (a: Availability) => {
    if (!window.confirm(`Remove “${a.talent.name} unavailable ${a.starts_on} to ${a.ends_on}”?`)) return;
    await api(`/api/availability/${a.id}`, { method: "DELETE" }).catch((err) => setError(errorMessage(err)));
    load();
  };

  const step = (direction: 1 | -1) =>
    setCursor((c) => (view === "month" ? addMonths(c, direction) : view === "week" ? addWeeks(c, direction) : addDays(c, 60 * direction)));

  const title =
    view === "month"
      ? format(cursor, "MMMM yyyy")
      : view === "week"
        ? `${format(range.start, "d MMM")} – ${format(range.end, "d MMM yyyy")}`
        : `From ${format(range.start, "d MMM yyyy")}`;

  const days = eachDayOfInterval(range);

  const renderDayCell = (day: Date, compact: boolean) => {
    const key = dayKey(day);
    const bookings = byDay.bookings.get(key) ?? [];
    const unavailable = byDay.unavailable.get(key) ?? [];
    const events = showEvents ? byDay.events.get(key) ?? [] : [];
    const outside = view === "month" && !isSameMonth(day, cursor);
    return (
      <div
        key={key}
        onClick={() => newBooking(day)}
        onDragOver={(e) => canEdit && e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          const id = e.dataTransfer.getData("text/booking");
          if (id) moveToDay(id, day);
        }}
        className={`min-h-24 space-y-1 border-b border-r p-1 ${outside ? "bg-gray-50/70" : "bg-white"} ${canEdit ? "cursor-pointer hover:bg-amber-50/40" : ""} ${
          compact ? "" : "min-h-40"
        }`}
      >
        <div className={`text-xs ${isToday(day) ? "inline-flex h-6 w-6 items-center justify-center rounded-full bg-black font-semibold text-white" : outside ? "text-gray-400" : "text-gray-600"}`}>
          {format(day, compact ? "d" : "EEE d")}
        </div>
        {unavailable.map((a) => (
          <div
            key={a.id}
            onClick={(e) => e.stopPropagation()}
            className={`group flex items-center justify-between gap-1 truncate rounded px-1.5 py-0.5 text-xs ${
              a.kind === "unavailable" ? "bg-red-100 text-red-800" : "bg-orange-50 text-orange-800"
            }`}
            title={a.note ?? undefined}
            style={{ backgroundImage: "repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(255,255,255,.5) 4px, rgba(255,255,255,.5) 8px)" }}
          >
            <span className="truncate">
              {a.talent.name.split(" ")[0]} {a.kind === "unavailable" ? "off" : "maybe off"}
            </span>
            {options?.can.availability && (
              <button type="button" onClick={() => removeAvailability(a)} aria-label="Remove" className="opacity-0 group-hover:opacity-100">
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        ))}
        {bookings.map((b) => (
          <BookingChip key={b.id} booking={b} showTalent={showTalent} onOpen={openBooking} draggable={canEdit} />
        ))}
        {events.map((e) => (
          <div key={e.id} onClick={(ev) => ev.stopPropagation()} className="truncate rounded border border-gray-200 px-1.5 py-0.5 text-xs text-gray-500" title={`Public event: ${e.talent_names.join(", ")}`}>
            ★ {e.title}
          </div>
        ))}
      </div>
    );
  };

  const listDays = days.filter((d) => byDay.bookings.has(dayKey(d)) || byDay.unavailable.has(dayKey(d)) || (showEvents && byDay.events.has(dayKey(d))));

  return (
    <SimpleMainLayout>
      <section className="bg-gradient-to-br from-black via-gray-900 to-black py-10 md:py-12">
        <div className="container mx-auto px-4">
          <AdminBackLink />
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <h1 className="mb-1 text-3xl font-bold text-white md:text-4xl">
                Bookings <span className="text-gold">Calendar</span>
              </h1>
              <p className="text-gray-300">
                {options && !options.can.edit ? "Your talents' schedule. You can add call times and logistics notes." : "Holds, confirmed jobs and who's unavailable."}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {options?.can.rates && (
                <Button asChild variant="outline" className="border-white/40 bg-transparent text-white hover:bg-white hover:text-black">
                  <Link href="/admin/bookings/rates">
                    <Percent className="mr-2 h-4 w-4" />
                    Commission rates
                  </Link>
                </Button>
              )}
              <Button variant="outline" onClick={() => setFeedOpen(true)} className="border-white/40 bg-transparent text-white hover:bg-white hover:text-black">
                <Rss className="mr-2 h-4 w-4" />
                Add to my calendar
              </Button>
              {options?.can.availability && (
                <Button variant="outline" onClick={() => setAvailabilityDay(dayKey(new Date()))} className="border-white/40 bg-transparent text-white hover:bg-white hover:text-black">
                  <CalendarPlus className="mr-2 h-4 w-4" />
                  Mark unavailable
                </Button>
              )}
              {canEdit && (
                <Button onClick={() => newBooking()} className="bg-gold text-black hover:bg-gold/90">
                  <Plus className="mr-2 h-4 w-4" />
                  New booking
                </Button>
              )}
            </div>
          </div>
        </div>
      </section>

      <div className="min-h-[60vh] bg-gray-50 py-6">
        <div className="container mx-auto space-y-4 px-4">
          {/* Toolbar */}
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => step(-1)} aria-label="Previous">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={() => setCursor(new Date())}>
                Today
              </Button>
              <Button variant="outline" size="sm" onClick={() => step(1)} aria-label="Next">
                <ChevronRight className="h-4 w-4" />
              </Button>
              <h2 className="ml-2 text-lg font-semibold">{title}</h2>
              {loading && <Loader2 className="h-4 w-4 animate-spin text-gray-400" />}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <select className={`${selectClass} w-auto bg-white`} value={talentId} onChange={(e) => setTalentId(e.target.value)} aria-label="Talent">
                <option value="">{options && !options.can.rates ? "All my talents" : "All talents"}</option>
                {options?.talents.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
              <div className="flex rounded-md border bg-white p-0.5 text-sm">
                {(["month", "week", "list"] as const).map((v) => (
                  <button key={v} onClick={() => setView(v)} className={`rounded px-3 py-1 capitalize ${view === v ? "bg-black text-white" : "text-gray-600"}`}>
                    {v}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {error && <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</div>}

          {/* Legend */}
          <div className="flex flex-wrap items-center gap-3 text-xs text-gray-600">
            {(Object.keys(BOOKING_STATUSES) as BookingStatus[]).map((s) => (
              <span key={s} className={`rounded border px-2 py-0.5 ${STATUS_STYLES[s]}`}>
                {BOOKING_STATUSES[s]}
              </span>
            ))}
            <span className="rounded bg-red-100 px-2 py-0.5 text-red-800">Unavailable</span>
            <label className="flex items-center gap-1.5">
              <input type="checkbox" checked={showEvents} onChange={(e) => setShowEvents(e.target.checked)} className="accent-[#D4AF37]" />
              ★ Public events
            </label>
          </div>

          {view === "list" ? (
            <div className="space-y-4">
              {listDays.length === 0 && !loading && <p className="rounded-lg border bg-white p-8 text-center text-sm text-gray-500">Nothing in the next 60 days.</p>}
              {listDays.map((day) => {
                const key = dayKey(day);
                return (
                  <section key={key} className="rounded-lg border bg-white">
                    <h3 className={`border-b px-4 py-2 text-sm font-semibold ${isToday(day) ? "text-gold" : ""}`}>{format(day, "EEEE d MMMM")}</h3>
                    <ul className="divide-y">
                      {(byDay.unavailable.get(key) ?? []).map((a) => (
                        <li key={a.id} className="flex items-center justify-between px-4 py-2 text-sm text-red-800">
                          {a.talent.name} {a.kind === "unavailable" ? "unavailable" : "maybe unavailable"}
                          {a.note ? ` (${a.note})` : ""}
                        </li>
                      ))}
                      {(byDay.bookings.get(key) ?? []).map((b) => (
                        <li key={b.id}>
                          <button onClick={() => openBooking(b)} className="flex w-full items-start justify-between gap-3 px-4 py-3 text-left hover:bg-gray-50">
                            <div className="min-w-0">
                              <p className={`font-medium ${b.status === "cancelled" ? "line-through text-gray-400" : ""}`}>
                                {format(new Date(b.starts_at), "HH:mm")}–{format(new Date(b.ends_at), "HH:mm")} · {b.talent.name}: {b.title}
                              </p>
                              <p className="truncate text-sm text-gray-500">
                                {[b.location, b.client?.name, b.call_time && `Call ${b.call_time}`].filter(Boolean).join(" · ")}
                              </p>
                            </div>
                            <div className="flex-shrink-0 text-right text-xs">
                              <span className={`rounded border px-2 py-0.5 ${STATUS_STYLES[b.status]}`}>{BOOKING_STATUSES[b.status]}</span>
                              {b.money?.fee_cents != null && <p className="mt-1 text-gray-500">{formatMoney(b.money.fee_cents, b.money.currency)}</p>}
                            </div>
                          </button>
                        </li>
                      ))}
                      {showEvents &&
                        (byDay.events.get(key) ?? []).map((e) => (
                          <li key={e.id} className="px-4 py-2 text-sm text-gray-500">
                            ★ {format(new Date(e.starts_at), "HH:mm")} {e.title} (public event: {e.talent_names.join(", ")})
                          </li>
                        ))}
                    </ul>
                  </section>
                );
              })}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <div className="min-w-[700px] overflow-hidden rounded-lg border-l border-t bg-white">
                <div className="grid grid-cols-7 border-b bg-gray-100 text-xs font-medium text-gray-600">
                  {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
                    <div key={d} className="border-r px-2 py-1.5">
                      {d}
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-7">{days.map((day) => renderDayCell(day, view === "month"))}</div>
              </div>
            </div>
          )}

          {canEdit && view !== "list" && <p className="text-xs text-gray-500">Click a day to add a booking. Drag a booking to another day to move it.</p>}
        </div>
      </div>

      {options && editing && (
        <BookingDialog
          open
          onOpenChange={(open) => !open && setEditing(null)}
          booking={editing.booking}
          defaults={editing.defaults}
          options={options}
          onSaved={load}
        />
      )}
      {options && (
        <AvailabilityDialog
          open={availabilityDay !== null}
          onOpenChange={(open) => !open && setAvailabilityDay(null)}
          options={options}
          defaultDay={availabilityDay ?? undefined}
          defaultTalentId={talentId || undefined}
          onSaved={load}
        />
      )}
      <CalendarFeedDialog open={feedOpen} onOpenChange={setFeedOpen} />
    </SimpleMainLayout>
  );
}
