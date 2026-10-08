"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AlertTriangle, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CRM_CURRENCIES } from "@/lib/crm/types";
import { BOOKING_STATUSES, TALENT_RESPONSES, commissionCents, netCents, type Booking, type BookingStatus, type Clash } from "@/lib/bookings/types";
import { Field, errorMessage, formatMoney, parseMoney, selectClass } from "@/components/crm/shared";

export interface BookingOptions {
  talents: { id: string; name: string; commission_percent: number | null }[];
  deals: { id: string; name: string; organisation_id: string | null; talent_ids: string[]; value_cents: number | null }[];
  clients: { id: string; name: string }[];
  can: {
    edit: boolean;
    fees: boolean;
    clientVisibility: boolean;
    logistics: boolean;
    availability: boolean;
    rates: boolean;
    delete: boolean;
  };
  hasPersonalAccount: boolean;
}

export interface BookingDefaults {
  talentId?: string;
  dealId?: string;
  startsAt?: Date;
  title?: string;
  feeCents?: number | null;
}

/** ISO string → value for <input type="datetime-local"> in the browser's time zone */
export function toLocalInput(value: string | Date): string {
  const d = new Date(value);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const fromLocalInput = (value: string) => new Date(value).toISOString();

interface FormState {
  talent_id: string;
  deal_id: string;
  organisation_id: string;
  title: string;
  status: BookingStatus;
  starts: string;
  ends: string;
  location: string;
  call_time: string;
  contact_name: string;
  contact_phone: string;
  brief: string;
  logistics_notes: string;
  fee: string;
  currency: string;
  commission: string;
  client_visible_to_talent: boolean;
  shared_with_talent: boolean;
}

function initialForm(booking: Booking | null, defaults: BookingDefaults, options: BookingOptions): FormState {
  if (booking) {
    return {
      talent_id: booking.talent.id,
      deal_id: booking.deal?.id ?? "",
      organisation_id: booking.client?.id ?? "",
      title: booking.title,
      status: booking.status,
      starts: toLocalInput(booking.starts_at),
      ends: toLocalInput(booking.ends_at),
      location: booking.location ?? "",
      call_time: booking.call_time ?? "",
      contact_name: booking.onsite_contact.name ?? "",
      contact_phone: booking.onsite_contact.phone ?? "",
      brief: booking.brief ?? "",
      logistics_notes: booking.logistics_notes ?? "",
      fee: booking.money?.fee_cents != null ? String(booking.money.fee_cents / 100) : "",
      currency: booking.money?.currency ?? "GBP",
      commission: booking.money?.commission_percent != null ? String(booking.money.commission_percent) : "",
      client_visible_to_talent: booking.client_visible_to_talent,
      shared_with_talent: booking.shared_with_talent,
    };
  }
  const start = defaults.startsAt ?? (() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(19, 0, 0, 0);
    return d;
  })();
  const end = new Date(start.getTime() + 4 * 60 * 60 * 1000);
  const talentId = defaults.talentId ?? (options.talents.length === 1 ? options.talents[0].id : "");
  const rate = options.talents.find((t) => t.id === talentId)?.commission_percent;
  const deal = options.deals.find((d) => d.id === defaults.dealId);
  return {
    talent_id: talentId,
    deal_id: defaults.dealId ?? "",
    organisation_id: deal?.organisation_id ?? "",
    title: defaults.title ?? deal?.name ?? "",
    status: "hold",
    starts: toLocalInput(start),
    ends: toLocalInput(end),
    location: "",
    call_time: "",
    contact_name: "",
    contact_phone: "",
    brief: "",
    logistics_notes: "",
    fee: defaults.feeCents != null ? String(defaults.feeCents / 100) : "",
    currency: "GBP",
    commission: rate != null ? String(rate) : "",
    client_visible_to_talent: false,
    shared_with_talent: true,
  };
}

export function BookingDialog({
  open,
  onOpenChange,
  booking,
  defaults = {},
  options,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  booking: Booking | null; // null = new booking
  defaults?: BookingDefaults;
  options: BookingOptions;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<FormState>(() => initialForm(booking, defaults, options));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [clashes, setClashes] = useState<Clash[] | null>(null);
  const logisticsOnly = !options.can.edit;

  useEffect(() => {
    if (!open) return;
    setForm(initialForm(booking, defaults, options));
    setError(null);
    setClashes(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, booking]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((f) => ({ ...f, [key]: value }));

  const chooseTalent = (talentId: string) => {
    const rate = options.talents.find((t) => t.id === talentId)?.commission_percent;
    // A new booking takes the talent's current commission rate
    setForm((f) => ({ ...f, talent_id: talentId, commission: booking ? f.commission : rate != null ? String(rate) : "" }));
  };

  const chooseDeal = (dealId: string) => {
    const deal = options.deals.find((d) => d.id === dealId);
    setForm((f) => ({
      ...f,
      deal_id: dealId,
      organisation_id: deal?.organisation_id ?? f.organisation_id,
      title: f.title || deal?.name || "",
    }));
  };

  const money = useMemo(() => {
    const fee = parseMoney(form.fee);
    const pct = form.commission === "" ? null : Number(form.commission);
    if (fee === undefined || fee === null || (pct !== null && Number.isNaN(pct))) return null;
    return { commission: commissionCents(fee, pct), net: netCents(fee, pct) };
  }, [form.fee, form.commission]);

  const dealsForTalent = options.deals.filter((d) => !form.talent_id || d.talent_ids.length === 0 || d.talent_ids.includes(form.talent_id));

  const save = async (force = false) => {
    setError(null);
    let payload: Record<string, unknown>;

    if (logisticsOnly) {
      payload = { call_time: form.call_time, logistics_notes: form.logistics_notes };
    } else {
      const fee = parseMoney(form.fee);
      if (fee === undefined) return setError("Enter the fee as a number, e.g. 800");
      const commission = form.commission === "" ? null : Number(form.commission);
      if (commission !== null && (Number.isNaN(commission) || commission < 0 || commission > 100)) {
        return setError("Commission must be between 0 and 100%");
      }
      if (!form.talent_id) return setError("Choose a talent");
      payload = {
        talent_id: form.talent_id,
        deal_id: form.deal_id || null,
        organisation_id: form.organisation_id || null,
        title: form.title,
        status: form.status,
        starts_at: fromLocalInput(form.starts),
        ends_at: fromLocalInput(form.ends),
        location: form.location,
        call_time: form.call_time,
        brief: form.brief,
        logistics_notes: form.logistics_notes,
        onsite_contact: { name: form.contact_name, phone: form.contact_phone },
        shared_with_talent: form.shared_with_talent,
        ...(options.can.clientVisibility ? { client_visible_to_talent: form.client_visible_to_talent } : {}),
        ...(options.can.fees ? { fee_cents: fee, currency: form.currency, commission_percent: commission } : {}),
        ...(force ? { force: true } : {}),
      };
    }

    setSaving(true);
    try {
      const response = await fetch(booking ? `/api/bookings/${booking.id}` : "/api/bookings", {
        method: booking ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await response.json().catch(() => ({}));
      if (response.status === 409 && body.code === "CLASH") {
        setClashes(body.clashes);
        return;
      }
      if (!response.ok || !body.success) throw new Error(body.error || "Failed to save");
      onSaved();
      onOpenChange(false);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!booking || !window.confirm("Delete this booking? To keep a record, set it to Cancelled instead.")) return;
    try {
      const response = await fetch(`/api/bookings/${booking.id}`, { method: "DELETE" });
      const body = await response.json();
      if (!body.success) throw new Error(body.error);
      onSaved();
      onOpenChange(false);
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  const readOnly = logisticsOnly;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{booking ? (readOnly ? booking.title : "Edit booking") : "New booking"}</DialogTitle>
          <DialogDescription>
            {readOnly
              ? "You can update the call time and logistics notes."
              : "A hold reserves the date; confirm it once the client has agreed."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {error && <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</div>}

          {clashes && (
            <div className="space-y-2 rounded border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
              <p className="flex items-center gap-2 font-medium">
                <AlertTriangle className="h-4 w-4" /> This clashes with:
              </p>
              <ul className="list-disc pl-6">
                {clashes.map((c) => (
                  <li key={`${c.kind}-${c.id}`}>{c.label}</li>
                ))}
              </ul>
              <div className="flex gap-2 pt-1">
                <Button size="sm" variant="outline" onClick={() => setClashes(null)}>
                  Change it
                </Button>
                <Button size="sm" onClick={() => save(true)} disabled={saving} className="bg-amber-600 text-white hover:bg-amber-700">
                  Save anyway
                </Button>
              </div>
            </div>
          )}

          {readOnly && booking ? (
            <dl className="grid gap-3 rounded border bg-gray-50 p-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-xs text-gray-500">Talent</dt>
                <dd>{booking.talent.name}</dd>
              </div>
              <div>
                <dt className="text-xs text-gray-500">Status</dt>
                <dd>{BOOKING_STATUSES[booking.status]}</dd>
              </div>
              <div>
                <dt className="text-xs text-gray-500">When</dt>
                <dd>
                  {new Date(booking.starts_at).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })} to{" "}
                  {new Date(booking.ends_at).toLocaleTimeString("en-GB", { timeStyle: "short" })}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-gray-500">Where</dt>
                <dd>{booking.location ?? "—"}</dd>
              </div>
              {booking.client && (
                <div>
                  <dt className="text-xs text-gray-500">Client</dt>
                  <dd>{booking.client.name}</dd>
                </div>
              )}
              {(booking.onsite_contact.name || booking.onsite_contact.phone) && (
                <div>
                  <dt className="text-xs text-gray-500">On-site contact</dt>
                  <dd>{[booking.onsite_contact.name, booking.onsite_contact.phone].filter(Boolean).join(" · ")}</dd>
                </div>
              )}
              {booking.brief && (
                <div className="sm:col-span-2">
                  <dt className="text-xs text-gray-500">Brief</dt>
                  <dd className="whitespace-pre-wrap">{booking.brief}</dd>
                </div>
              )}
            </dl>
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Talent">
                  <select className={selectClass} value={form.talent_id} onChange={(e) => chooseTalent(e.target.value)}>
                    <option value="">Choose…</option>
                    {options.talents.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Status">
                  <select className={selectClass} value={form.status} onChange={(e) => set("status", e.target.value as BookingStatus)}>
                    {Object.entries(BOOKING_STATUSES).map(([key, label]) => (
                      <option key={key} value={key}>
                        {label}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
              <Field label="Title">
                <Input value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="e.g. DJ set, launch party" />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Starts">
                  <Input type="datetime-local" value={form.starts} onChange={(e) => set("starts", e.target.value)} />
                </Field>
                <Field label="Ends">
                  <Input type="datetime-local" value={form.ends} onChange={(e) => set("ends", e.target.value)} />
                </Field>
              </div>
              <Field label="Location">
                <Input value={form.location} onChange={(e) => set("location", e.target.value)} placeholder="Venue, address" />
              </Field>
              {(options.deals.length > 0 || options.clients.length > 0) && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="From deal">
                    <select className={selectClass} value={form.deal_id} onChange={(e) => chooseDeal(e.target.value)}>
                      <option value="">None</option>
                      {dealsForTalent.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Client">
                    <select className={selectClass} value={form.organisation_id} onChange={(e) => set("organisation_id", e.target.value)}>
                      <option value="">None</option>
                      {options.clients.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </Field>
                </div>
              )}
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="On-site contact name">
                  <Input value={form.contact_name} onChange={(e) => set("contact_name", e.target.value)} />
                </Field>
                <Field label="On-site contact phone">
                  <Input value={form.contact_phone} onChange={(e) => set("contact_phone", e.target.value)} />
                </Field>
              </div>
              <Field label="Brief">
                <Textarea rows={3} value={form.brief} onChange={(e) => set("brief", e.target.value)} placeholder="What the client wants, dress code, set length…" />
              </Field>
            </>
          )}

          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Call time">
              <Input value={form.call_time} onChange={(e) => set("call_time", e.target.value)} placeholder="e.g. 17:30 at stage door" />
            </Field>
            <div className="sm:col-span-2">
              <Field label="Logistics notes" hint="Travel, parking, rider, equipment">
                <Textarea rows={2} value={form.logistics_notes} onChange={(e) => set("logistics_notes", e.target.value)} />
              </Field>
            </div>
          </div>

          {!readOnly && options.can.fees && (
            <div className="space-y-3 rounded border p-3">
              <div className="grid gap-4 sm:grid-cols-3">
                <Field label="Fee (client pays)">
                  <div className="flex gap-2">
                    <select className={`${selectClass} w-24`} value={form.currency} onChange={(e) => set("currency", e.target.value)}>
                      {CRM_CURRENCIES.map((c) => (
                        <option key={c}>{c}</option>
                      ))}
                    </select>
                    <Input inputMode="decimal" value={form.fee} onChange={(e) => set("fee", e.target.value)} placeholder="0" />
                  </div>
                </Field>
                <Field label="Commission %" hint={booking ? "Rate saved with this booking" : "From the talent's rate"}>
                  <Input inputMode="decimal" value={form.commission} onChange={(e) => set("commission", e.target.value)} placeholder="0" />
                </Field>
                <div className="text-sm">
                  <p className="text-gray-500">Agency commission</p>
                  <p className="font-medium">{money ? formatMoney(money.commission, form.currency) : "—"}</p>
                  <p className="mt-1 text-gray-500">Talent receives</p>
                  <p className="font-semibold">{money ? formatMoney(money.net, form.currency) : "—"}</p>
                </div>
              </div>
              <p className="text-xs text-gray-500">The talent only ever sees what they receive.</p>
            </div>
          )}

          {!readOnly && (
            <div className="space-y-2">
              <label className="flex items-center justify-between gap-4 rounded border p-3">
                <span>
                  <span className="block text-sm font-medium">Show to the talent</span>
                  <span className="block text-xs text-gray-500">Appears in their portal and calendar once it opens.</span>
                </span>
                <Switch checked={form.shared_with_talent} onCheckedChange={(v) => set("shared_with_talent", v)} />
              </label>
              {options.can.clientVisibility && (
                <label className="flex items-center justify-between gap-4 rounded border p-3">
                  <span>
                    <span className="block text-sm font-medium">Talent can see the client&apos;s name</span>
                    <span className="block text-xs text-gray-500">Off: they see the event, place and times only.</span>
                  </span>
                  <Switch checked={form.client_visible_to_talent} onCheckedChange={(v) => set("client_visible_to_talent", v)} />
                </label>
              )}
            </div>
          )}

          {booking && (
            <p className="text-xs text-gray-500">
              {TALENT_RESPONSES[booking.talent_response]}
              {booking.deal && (
                <>
                  {" · From deal "}
                  <Link href={`/admin/crm/deals/${booking.deal.id}`} className="underline hover:text-gold">
                    {booking.deal.name}
                  </Link>
                </>
              )}
            </p>
          )}
        </div>

        <DialogFooter className="gap-2">
          {booking && options.can.delete && (
            <Button variant="outline" onClick={remove} className="mr-auto text-red-700" aria-label="Delete booking">
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={() => save(false)} disabled={saving} className="bg-gold text-black hover:bg-gold/90">
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {booking ? "Save" : "Create booking"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
