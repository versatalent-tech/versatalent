"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { Copy, Download, ExternalLink, Instagram, Loader2, Pencil, Plus, Printer, Search, Trash2 } from "lucide-react";
import { SimpleMainLayout } from "@/components/layout/SimpleMainLayout";
import { AdminBackLink } from "@/components/admin/AdminBackLink";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api, errorMessage } from "@/components/crm/shared";
import type { AdminTicketOrder, AdminTicketType, TicketSummary } from "@/lib/db/repositories/tickets";
import { HEARD_FROM, ORDER_STATUS_LABELS, formatPrice, instagramUrl } from "@/lib/tickets/types";

interface TicketEvent {
  id: string;
  title: string;
  starts_at: string;
  status: string;
  ticket_types: number;
  sold: number;
}

const selectClass = "h-9 rounded-md border border-input bg-white px-3 text-sm shadow-sm";
const STATUS_STYLES: Record<string, string> = {
  paid: "bg-green-100 text-green-800",
  pending: "bg-amber-100 text-amber-800",
  payment_failed: "bg-red-100 text-red-800",
  expired: "bg-gray-100 text-gray-600",
  refunded: "bg-purple-100 text-purple-800",
  cancelled: "bg-gray-100 text-gray-600",
};

/** "2026-11-01T22:00" in the browser's time, for datetime-local inputs */
const toLocalInput = (iso: string | null) => (iso ? format(new Date(iso), "yyyy-MM-dd'T'HH:mm") : "");
const fromLocalInput = (value: string) => (value ? new Date(value).toISOString() : null);

// ---------------------------------------------------------------------------
// Ticket types
// ---------------------------------------------------------------------------

function TicketTypeForm({ eventId, type, onDone }: { eventId: string; type: AdminTicketType | null; onDone: (saved: boolean) => void }) {
  const [form, setForm] = useState({
    name: type?.name ?? "General admission",
    description: type?.description ?? "",
    price: type ? (type.price_cents / 100).toFixed(2) : "",
    capacity: type?.capacity === null || type?.capacity === undefined ? "" : String(type.capacity),
    max_per_order: String(type?.max_per_order ?? 6),
    sales_start: toLocalInput(type?.sales_start ?? null),
    sales_end: toLocalInput(type?.sales_end ?? null),
    sort_order: String(type?.sort_order ?? 0),
    is_active: type?.is_active ?? true,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const price = Math.round(Number(form.price) * 100);
    if (form.price.trim() === "" || !Number.isFinite(price) || price < 0) return setError("Enter a price, e.g. 15.00 (0 for free)");
    setSaving(true);
    setError(null);
    try {
      const json = {
        event_id: eventId,
        name: form.name,
        description: form.description,
        price_cents: price,
        capacity: form.capacity.trim() === "" ? null : Number(form.capacity),
        max_per_order: Number(form.max_per_order) || 6,
        sales_start: fromLocalInput(form.sales_start),
        sales_end: fromLocalInput(form.sales_end),
        sort_order: Number(form.sort_order) || 0,
        is_active: form.is_active,
      };
      await api(type ? `/api/admin/tickets/types/${type.id}` : "/api/admin/tickets/types", { method: type ? "PUT" : "POST", json });
      onDone(true);
    } catch (err) {
      setError(errorMessage(err));
      setSaving(false);
    }
  };

  const field = (key: keyof typeof form, label: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <label className="text-sm">
      <span className="mb-1 block text-xs text-gray-500">{label}</span>
      <Input value={form[key] as string} onChange={set(key)} {...props} />
    </label>
  );

  return (
    <form onSubmit={save} className="space-y-3 rounded-lg border border-gold/40 bg-amber-50/40 p-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {field("name", "Name")}
        {field("price", "Price (£, 0 = free)", { inputMode: "decimal", placeholder: "15.00" })}
        {field("capacity", "How many (blank = no limit)", { inputMode: "numeric" })}
        {field("max_per_order", "Most per order", { inputMode: "numeric" })}
        <div className="sm:col-span-2">{field("description", "Description (optional)", { placeholder: "e.g. Entry before 11pm" })}</div>
        {field("sales_start", "Sales start (blank = now)", { type: "datetime-local" })}
        {field("sales_end", "Sales end (blank = when the event ends)", { type: "datetime-local" })}
        {field("sort_order", "Order on the page", { inputMode: "numeric" })}
        <label className="flex items-center gap-2 self-end pb-2 text-sm">
          <input type="checkbox" checked={form.is_active} onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))} className="h-4 w-4 accent-[#D4AF37]" />
          On sale
        </label>
      </div>
      <p className="text-xs text-gray-500">A new price applies to new orders only. Times are in your computer&apos;s time zone.</p>
      {error && <p className="text-sm text-red-700">{error}</p>}
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={saving} className="bg-gold text-black hover:bg-gold/90">
          {saving && <Loader2 className="mr-1 h-4 w-4 animate-spin" />} {type ? "Save ticket" : "Add ticket"}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => onDone(false)}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

function TicketTypes({ event, onChanged }: { event: TicketEvent; onChanged: () => void }) {
  const [types, setTypes] = useState<AdminTicketType[] | null>(null);
  const [editing, setEditing] = useState<AdminTicketType | "new" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    try {
      setTypes(await api<AdminTicketType[]>(`/api/admin/tickets/types?event=${event.id}`));
    } catch (err) {
      setError(errorMessage(err));
    }
  }, [event.id]);
  useEffect(() => {
    setTypes(null);
    setEditing(null);
    load();
  }, [load]);

  const remove = async (t: AdminTicketType) => {
    if (!window.confirm(`Remove "${t.name}"? If anyone has bought it, it's taken off sale instead.`)) return;
    try {
      await api(`/api/admin/tickets/types/${t.id}`, { method: "DELETE" });
      load();
      onChanged();
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  const link = typeof window === "undefined" ? "" : `${window.location.origin}/events/${event.id}/tickets`;
  const copy = async () => {
    await navigator.clipboard.writeText(link).catch(() => undefined);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section className="space-y-3 rounded-lg border bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">Tickets for this event</h2>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={copy}>
            <Copy className="mr-1 h-4 w-4" /> {copied ? "Copied" : "Copy buying link"}
          </Button>
          <Link href={`/events/${event.id}/tickets`} target="_blank">
            <Button size="sm" variant="outline">
              <ExternalLink className="mr-1 h-4 w-4" /> View page
            </Button>
          </Link>
          <Button size="sm" className="bg-gold text-black hover:bg-gold/90" onClick={() => setEditing("new")}>
            <Plus className="mr-1 h-4 w-4" /> Add ticket type
          </Button>
        </div>
      </div>
      <p className="text-xs text-gray-500">
        To see which posts sell tickets, add campaign tags to the link you share, e.g. <code>?utm_source=instagram&amp;utm_campaign=launch</code>.
      </p>
      {error && <p className="text-sm text-red-700">{error}</p>}
      {editing === "new" && (
        <TicketTypeForm
          eventId={event.id}
          type={null}
          onDone={(saved) => {
            setEditing(null);
            if (saved) {
              load();
              onChanged();
            }
          }}
        />
      )}
      {!types ? (
        <Loader2 className="h-5 w-5 animate-spin text-gold" />
      ) : types.length === 0 && editing !== "new" ? (
        <p className="text-sm text-gray-500">No tickets yet. Add one to start selling on the website.</p>
      ) : (
        <ul className="divide-y">
          {types.map((t) =>
            editing !== "new" && editing?.id === t.id ? (
              <li key={t.id} className="py-3">
                <TicketTypeForm
                  eventId={event.id}
                  type={t}
                  onDone={(saved) => {
                    setEditing(null);
                    if (saved) load();
                  }}
                />
              </li>
            ) : (
              <li key={t.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="font-medium">
                    {t.name} <span className="font-normal text-gray-500">· {formatPrice(t.price_cents, t.currency)}</span>
                    {!t.is_active && <span className="ml-2 rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600">Off sale</span>}
                  </p>
                  <p className="text-xs text-gray-500">
                    {t.sold} sold{t.held > 0 ? ` · ${t.held} awaiting payment` : ""}
                    {t.capacity !== null ? ` · ${Math.max(0, t.capacity - t.sold - t.held)} of ${t.capacity} left` : " · no limit"}
                    {t.sales_start ? ` · from ${format(new Date(t.sales_start), "d MMM HH:mm")}` : ""}
                    {t.sales_end ? ` · until ${format(new Date(t.sales_end), "d MMM HH:mm")}` : ""}
                  </p>
                </div>
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" onClick={() => setEditing(t)} aria-label={`Edit ${t.name}`}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="ghost" className="text-red-700" onClick={() => remove(t)} aria-label={`Remove ${t.name}`}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </li>
            )
          )}
        </ul>
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Analysis
// ---------------------------------------------------------------------------

function Breakdown({ title, rows, total }: { title: string; rows: { label: string; value: number }[]; total: number }) {
  return (
    <div className="rounded-lg border bg-white p-4">
      <h3 className="mb-2 text-sm font-semibold">{title}</h3>
      {rows.length === 0 ? (
        <p className="text-xs text-gray-500">No data yet</p>
      ) : (
        <ul className="space-y-1.5">
          {rows.map((r) => (
            <li key={r.label} className="text-sm">
              <div className="flex justify-between gap-2">
                <span className="truncate">{r.label}</span>
                <span className="tabular-nums text-gray-600">{r.value}</span>
              </div>
              <div className="mt-0.5 h-1.5 rounded bg-gray-100">
                <div className="h-1.5 rounded bg-gold" style={{ width: `${total ? Math.round((r.value / total) * 100) : 0}%` }} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Analysis({ summary }: { summary: TicketSummary }) {
  const tiles = [
    ["Tickets sold", summary.tickets.toLocaleString("en-GB")],
    ["Revenue", formatPrice(summary.revenue_cents)],
    ["Orders", summary.orders.toLocaleString("en-GB")],
    ["Buyers", summary.buyers.toLocaleString("en-GB")],
    ["Came back for another event", summary.repeat_buyers.toLocaleString("en-GB")],
    ["Bought as members", summary.member_orders.toLocaleString("en-GB")],
    ["Agreed to marketing emails", summary.marketing_opt_ins.toLocaleString("en-GB")],
    ["Tickets ticked off at the door", summary.arrived_tickets.toLocaleString("en-GB")],
  ];
  const label = (key: string | null, map?: Record<string, string>) => (key ? map?.[key] ?? key : "Not given");
  return (
    <div className="space-y-4">
      <p className="text-xs text-gray-500">Paid orders only.</p>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {tiles.map(([title, value]) => (
          <div key={title} className="rounded-lg border bg-white p-4">
            <p className="text-xs text-gray-500">{title}</p>
            <p className="text-2xl font-bold">{value}</p>
          </div>
        ))}
      </div>
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        <Breakdown title="Ticket types" total={summary.tickets} rows={summary.by_type.map((r) => ({ label: `${r.name} (${formatPrice(r.revenue_cents)})`, value: r.tickets }))} />
        <Breakdown title="How they heard (orders)" total={summary.orders} rows={summary.by_heard_from.map((r) => ({ label: label(r.key, HEARD_FROM), value: r.orders }))} />
        <Breakdown
          title="Where they bought from (orders)"
          total={summary.orders}
          rows={summary.by_source.map((r) => ({ label: label(r.key, { website: "Website", card_tap: "VersaTalent card tap", member_pass: "Member pass page" }), value: r.orders }))}
        />
        <Breakdown title="Campaign tags (orders)" total={summary.orders} rows={summary.by_campaign.map((r) => ({ label: r.key, value: r.orders }))} />
        <Breakdown title="Town or city (orders)" total={summary.orders} rows={summary.by_city.map((r) => ({ label: r.key, value: r.orders }))} />
        <Breakdown title="Age (orders)" total={summary.orders} rows={summary.by_age.map((r) => ({ label: label(r.key), value: r.orders }))} />
        <Breakdown title="Tickets sold by day" total={Math.max(1, ...summary.by_day.map((d) => d.tickets))} rows={summary.by_day.map((d) => ({ label: format(new Date(d.day), "EEE d MMM"), value: d.tickets }))} />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Orders and door list
// ---------------------------------------------------------------------------

function OrderRow({ o, showEvent, onAction }: { o: AdminTicketOrder; showEvent: boolean; onAction: () => void }) {
  const [busy, setBusy] = useState(false);
  const refund = async () => {
    const reason = window.prompt(
      `Refund ${o.reference} (${formatPrice(o.total_cents, o.currency)})?\n\nRefund the payment in SumUp first, then confirm here. The order is marked refunded${o.points_awarded ? ` and ${o.points_awarded} points are taken back` : ""}.\n\nReason:`
    );
    if (reason === null) return;
    setBusy(true);
    try {
      await api(`/api/admin/tickets/orders/${o.id}`, { method: "PATCH", json: { action: "refund", reason } });
      onAction();
    } catch (err) {
      window.alert(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };
  return (
    <li className="flex flex-col gap-2 rounded-lg border bg-white p-4 md:flex-row md:items-start md:justify-between">
      <div className="min-w-0 space-y-1">
        <p className="flex flex-wrap items-center gap-2 font-semibold">
          {o.first_name} {o.last_name}
          <a href={instagramUrl(o.instagram)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm font-normal text-pink-700 hover:underline">
            <Instagram className="h-3.5 w-3.5" />@{o.instagram}
          </a>
          <span className={`rounded px-2 py-0.5 text-xs font-normal ${STATUS_STYLES[o.status] ?? "bg-gray-100"}`}>
            {ORDER_STATUS_LABELS[o.status] ?? o.status}
            {o.hold_ended && o.status === "pending" ? " (hold ended)" : ""}
          </span>
          {o.previous_orders > 0 && <span className="rounded bg-blue-50 px-2 py-0.5 text-xs font-normal text-blue-800">Returning buyer</span>}
        </p>
        <p className="text-sm text-gray-700">
          {o.items.map((i) => `${i.quantity} × ${i.name}`).join(", ")} · {formatPrice(o.total_cents, o.currency)}
          {showEvent ? ` · ${o.event_title}` : ""}
        </p>
        <p className="text-xs text-gray-500">
          {o.reference} · {format(new Date(o.created_at), "d MMM yyyy HH:mm")} · {o.email}
          {o.phone ? ` · ${o.phone}` : ""}
          {o.city ? ` · ${o.city}` : ""}
          {o.age_range ? ` · ${o.age_range}` : ""}
          {o.heard_from ? ` · heard via ${HEARD_FROM[o.heard_from as keyof typeof HEARD_FROM] ?? o.heard_from}` : ""}
          {o.utm_campaign || o.utm_source ? ` · campaign ${[o.utm_source, o.utm_campaign].filter(Boolean).join("/")}` : ""}
          {o.marketing_consent ? " · ✓ marketing" : ""}
          {o.member ? ` · member ${o.member.name}${o.points_awarded ? ` (+${o.points_awarded} pts)` : ""}` : ""}
        </p>
        {o.refund_reason && <p className="text-xs italic text-gray-500">Refund: {o.refund_reason}</p>}
      </div>
      {o.status === "paid" && (
        <Button size="sm" variant="ghost" className="flex-shrink-0 text-red-700" disabled={busy} onClick={refund}>
          Refund
        </Button>
      )}
    </li>
  );
}

function DoorList({ orders, event, onChanged }: { orders: AdminTicketOrder[]; event: TicketEvent; onChanged: () => void }) {
  const paid = useMemo(
    () => orders.filter((o) => o.status === "paid").sort((a, b) => `${a.last_name} ${a.first_name}`.localeCompare(`${b.last_name} ${b.first_name}`)),
    [orders]
  );
  const toggle = async (o: AdminTicketOrder) => {
    try {
      await api(`/api/admin/tickets/orders/${o.id}`, { method: "PATCH", json: { action: "arrived", arrived: !o.arrived_at } });
      onChanged();
    } catch (err) {
      window.alert(errorMessage(err));
    }
  };
  const tickets = paid.reduce((n, o) => n + o.quantity, 0);
  const arrived = paid.filter((o) => o.arrived_at).reduce((n, o) => n + o.quantity, 0);
  return (
    <div className="space-y-3 print:space-y-1">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-gray-600">
          <span className="hidden font-semibold print:inline">{event.title} · </span>
          {tickets} tickets on {paid.length} orders · {arrived} arrived
        </p>
        <Button size="sm" variant="outline" onClick={() => window.print()} className="print:hidden">
          <Printer className="mr-1 h-4 w-4" /> Print
        </Button>
      </div>
      <table className="w-full rounded-lg border bg-white text-sm">
        <thead className="bg-gray-50 text-left text-xs text-gray-500">
          <tr>
            <th className="p-2">Arrived</th>
            <th className="p-2">Name</th>
            <th className="p-2">Tickets</th>
            <th className="p-2">Reference</th>
            <th className="p-2">Instagram</th>
          </tr>
        </thead>
        <tbody>
          {paid.map((o) => (
            <tr key={o.id} className="border-t">
              <td className="p-2">
                <input type="checkbox" checked={Boolean(o.arrived_at)} onChange={() => toggle(o)} className="h-5 w-5 accent-[#D4AF37]" aria-label={`${o.first_name} ${o.last_name} arrived`} />
              </td>
              <td className="p-2 font-medium">
                {o.last_name}, {o.first_name}
              </td>
              <td className="p-2">{o.items.map((i) => `${i.quantity} × ${i.name}`).join(", ")}</td>
              <td className="p-2 font-mono text-xs">{o.reference}</td>
              <td className="p-2 text-xs">@{o.instagram}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ---------------------------------------------------------------------------

export default function TicketsAdminPage() {
  const [events, setEvents] = useState<TicketEvent[] | null>(null);
  const [eventId, setEventId] = useState<string>("");
  const [tab, setTab] = useState<"orders" | "analysis" | "door">("orders");
  const [status, setStatus] = useState("paid");
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [data, setData] = useState<{ orders: AdminTicketOrder[]; summary: TicketSummary } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadEvents = useCallback(async () => {
    try {
      const list = await api<TicketEvent[]>("/api/admin/tickets/events");
      setEvents(list);
      setEventId((current) => current || list.find((e) => new Date(e.starts_at).getTime() > Date.now() - 86400000)?.id || "");
    } catch (err) {
      setError(errorMessage(err));
    }
  }, []);
  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  const params = useMemo(() => {
    const p = new URLSearchParams();
    if (eventId) p.set("event", eventId);
    if (tab === "orders" && status) p.set("status", status);
    if (tab === "door") p.set("status", "paid");
    if (tab === "orders" && query) p.set("q", query);
    return p;
  }, [eventId, status, query, tab]);

  const loadOrders = useCallback(async () => {
    try {
      setData(await api(`/api/admin/tickets/orders?${params}`));
    } catch (err) {
      setError(errorMessage(err));
    }
  }, [params]);
  useEffect(() => {
    if (events) loadOrders();
  }, [events, loadOrders]);

  const event = events?.find((e) => e.id === eventId) ?? null;
  const csvParams = new URLSearchParams(params);
  csvParams.set("format", "csv");
  if (tab !== "orders") csvParams.delete("status");

  return (
    <SimpleMainLayout>
      <section className="bg-gradient-to-br from-black via-gray-900 to-black py-10 md:py-12 print:hidden">
        <div className="container mx-auto px-4">
          <AdminBackLink />
          <h1 className="mb-1 text-3xl font-bold text-white md:text-4xl">
            <span className="text-gold">Tickets</span>
          </h1>
          <p className="text-gray-300">Sell event tickets on the website, see who bought them and where they came from.</p>
        </div>
      </section>

      <div className="min-h-[50vh] bg-gray-50 py-6 print:bg-white print:py-0">
        <div className="container mx-auto space-y-4 px-4">
          {error && <p className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}
          {!events ? (
            <Loader2 className="mx-auto mt-10 h-8 w-8 animate-spin text-gold" />
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-3 print:hidden">
                <select className={selectClass} value={eventId} onChange={(e) => setEventId(e.target.value)} aria-label="Event">
                  <option value="">All events</option>
                  {events.map((e) => (
                    <option key={e.id} value={e.id}>
                      {format(new Date(e.starts_at), "d MMM yyyy")} · {e.title}
                      {e.sold ? ` (${e.sold} sold)` : e.ticket_types ? "" : " (no tickets yet)"}
                    </option>
                  ))}
                </select>
                <a href={`/api/admin/tickets/orders?${csvParams}`}>
                  <Button size="sm" variant="outline">
                    <Download className="mr-1 h-4 w-4" /> Export CSV
                  </Button>
                </a>
              </div>

              {event && (
                <div className="print:hidden">
                  <TicketTypes event={event} onChanged={loadEvents} />
                </div>
              )}

              <div className="flex flex-wrap gap-2 print:hidden">
                {(
                  [
                    ["orders", "Orders"],
                    ["analysis", "Analysis"],
                    ...(event ? [["door", "Door list"]] : []),
                  ] as [typeof tab, string][]
                ).map(([key, label]) => (
                  <button
                    key={key}
                    onClick={() => setTab(key)}
                    className={`rounded-full border px-3 py-1 text-sm ${tab === key ? "border-black bg-black text-white" : "bg-white text-gray-600"}`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {!data ? (
                <Loader2 className="mx-auto mt-6 h-6 w-6 animate-spin text-gold" />
              ) : tab === "analysis" ? (
                <Analysis summary={data.summary} />
              ) : tab === "door" && event ? (
                <DoorList orders={data.orders} event={event} onChanged={loadOrders} />
              ) : (
                <div className="space-y-3">
                  <form
                    className="flex flex-wrap gap-2"
                    onSubmit={(e) => {
                      e.preventDefault();
                      setQuery(search);
                    }}
                  >
                    <select className={selectClass} value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Status">
                      <option value="">All statuses</option>
                      {Object.entries(ORDER_STATUS_LABELS).map(([key, label]) => (
                        <option key={key} value={key}>{label}</option>
                      ))}
                    </select>
                    <div className="relative">
                      <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
                      <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Name, email, @instagram, reference" className="w-72 bg-white pl-8" />
                    </div>
                  </form>
                  {data.orders.length === 0 ? (
                    <p className="rounded-lg border bg-white p-10 text-center text-sm text-gray-500">No orders here yet.</p>
                  ) : (
                    <ul className="space-y-2">
                      {data.orders.map((o) => (
                        <OrderRow key={o.id} o={o} showEvent={!eventId} onAction={loadOrders} />
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </SimpleMainLayout>
  );
}
