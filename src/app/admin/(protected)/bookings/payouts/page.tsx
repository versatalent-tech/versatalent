"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { ArrowLeft, CheckCircle2, Loader2, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SimpleMainLayout } from "@/components/layout/SimpleMainLayout";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { Booking } from "@/lib/bookings/types";
import { Field, api, errorMessage, formatMoney } from "@/components/crm/shared";

type View = "owed" | "paid";

/** "£1,200 + €300" */
function totalLabel(items: { cents: number; currency: string }[]): string {
  const totals = new Map<string, number>();
  for (const i of items) totals.set(i.currency, (totals.get(i.currency) ?? 0) + i.cents);
  return totals.size === 0 ? formatMoney(0) : [...totals].map(([c, cents]) => formatMoney(cents, c)).join(" + ");
}

export default function PayoutsPage() {
  const [view, setView] = useState<View>("owed");
  const [bookings, setBookings] = useState<Booking[] | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [dialog, setDialog] = useState(false);
  const [paidOn, setPaidOn] = useState(() => new Date().toISOString().slice(0, 10));
  const [reference, setReference] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setBookings(null);
    try {
      setBookings(await api<Booking[]>(`/api/payouts?view=${view}`));
      setError(null);
    } catch (err) {
      setError(errorMessage(err));
    }
  }, [view]);

  useEffect(() => {
    setSelected(new Set());
    load();
  }, [load]);

  const byTalent = useMemo(() => {
    const groups = new Map<string, { name: string; items: Booking[] }>();
    for (const b of bookings ?? []) {
      const g = groups.get(b.talent.id) ?? { name: b.talent.name, items: [] };
      g.items.push(b);
      groups.set(b.talent.id, g);
    }
    return [...groups.entries()];
  }, [bookings]);

  const amount = (b: Booking) => (view === "paid" ? b.money?.paid_cents : b.money?.net_cents) ?? 0;
  const chosen = (bookings ?? []).filter((b) => selected.has(b.id));

  const toggle = (ids: string[], on: boolean) =>
    setSelected((s) => {
      const next = new Set(s);
      ids.forEach((id) => (on ? next.add(id) : next.delete(id)));
      return next;
    });

  const markPaid = async () => {
    setSaving(true);
    setError(null);
    try {
      const response = await fetch("/api/payouts/paid", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ booking_ids: chosen.map((b) => b.id), paid_on: paidOn, reference }),
      });
      const body = await response.json();
      if (!body.success) throw new Error(body.error);
      setNotice(body.message);
      setDialog(false);
      setReference("");
      setSelected(new Set());
      load();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const undo = async (b: Booking) => {
    if (!window.confirm(`Remove the payment recorded for “${b.title}” (${b.talent.name})? It will show as owed again.`)) return;
    try {
      await api(`/api/payouts/${b.id}`, { method: "DELETE" });
      load();
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  return (
    <SimpleMainLayout>
      <section className="bg-gradient-to-br from-black via-gray-900 to-black py-10 md:py-12">
        <div className="container mx-auto px-4">
          <Link href="/admin/bookings" className="mb-3 inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-gold">
            <ArrowLeft className="h-4 w-4" />
            Back to calendar
          </Link>
          <h1 className="mb-1 text-3xl font-bold text-white md:text-4xl">
            Talent <span className="text-gold">Payouts</span>
          </h1>
          <p className="max-w-2xl text-gray-300">
            What talents are owed for finished jobs (their fee minus commission), and what&apos;s been paid. Talents see the same in their portal.
          </p>
        </div>
      </section>

      <div className="min-h-[50vh] bg-gray-50 py-6">
        <div className="container mx-auto max-w-4xl space-y-4 px-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex rounded-md border bg-white p-0.5 text-sm">
              {(["owed", "paid"] as const).map((v) => (
                <button key={v} onClick={() => setView(v)} className={`rounded px-3 py-1 ${view === v ? "bg-black text-white" : "text-gray-600"}`}>
                  {v === "owed" ? "To pay" : "Paid (last 4 months)"}
                </button>
              ))}
            </div>
            {view === "owed" && (
              <Button onClick={() => setDialog(true)} disabled={chosen.length === 0} className="bg-gold text-black hover:bg-gold/90">
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Mark {chosen.length || ""} as paid{chosen.length ? ` · ${totalLabel(chosen.map((b) => ({ cents: amount(b), currency: b.money?.currency ?? "GBP" })))}` : ""}
              </Button>
            )}
          </div>

          {notice && <p className="rounded border border-green-200 bg-green-50 p-3 text-sm text-green-900">{notice}</p>}
          {error && <p className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}

          {!bookings ? (
            <Loader2 className="mx-auto mt-10 h-8 w-8 animate-spin text-gold" />
          ) : byTalent.length === 0 ? (
            <p className="rounded-lg border bg-white p-10 text-center text-sm text-gray-500">
              {view === "owed" ? "Nothing to pay: every finished job with a fee has been paid." : "No payments recorded recently."}
            </p>
          ) : (
            byTalent.map(([talentId, group]) => {
              const ids = group.items.map((b) => b.id);
              const allOn = ids.every((id) => selected.has(id));
              return (
                <section key={talentId} className="overflow-hidden rounded-lg border bg-white">
                  <header className="flex items-center justify-between gap-3 border-b bg-gray-50 px-4 py-2">
                    <label className="flex items-center gap-2 font-semibold">
                      {view === "owed" && (
                        <input type="checkbox" checked={allOn} onChange={(e) => toggle(ids, e.target.checked)} className="h-4 w-4 accent-[#D4AF37]" />
                      )}
                      {group.name}
                    </label>
                    <span className="text-sm font-medium">
                      {totalLabel(group.items.map((b) => ({ cents: amount(b), currency: b.money?.currency ?? "GBP" })))}
                    </span>
                  </header>
                  <ul className="divide-y">
                    {group.items.map((b) => (
                      <li key={b.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                        <label className="flex min-w-0 items-center gap-3">
                          {view === "owed" && (
                            <input
                              type="checkbox"
                              checked={selected.has(b.id)}
                              onChange={(e) => toggle([b.id], e.target.checked)}
                              className="h-4 w-4 flex-shrink-0 accent-[#D4AF37]"
                            />
                          )}
                          <span className="min-w-0">
                            <span className="block truncate font-medium">{b.title}</span>
                            <span className="block text-xs text-gray-500">
                              {format(new Date(b.starts_at), "EEE d MMM yyyy")}
                              {b.client ? ` · ${b.client.name}` : ""}
                              {view === "owed" && b.money?.fee_cents != null
                                ? ` · fee ${formatMoney(b.money.fee_cents, b.money.currency)} − ${b.money.commission_percent ?? 0}%`
                                : ""}
                              {view === "paid" && b.money?.paid_at ? ` · paid ${format(new Date(b.money.paid_at), "d MMM yyyy")}` : ""}
                              {view === "paid" && b.money?.paid_reference ? ` · ref ${b.money.paid_reference}` : ""}
                            </span>
                          </span>
                        </label>
                        <span className="flex flex-shrink-0 items-center gap-2">
                          <span className="font-semibold">{formatMoney(amount(b), b.money?.currency)}</span>
                          {view === "paid" && (
                            <button onClick={() => undo(b)} aria-label="Undo payment" className="text-gray-400 hover:text-red-600">
                              <Undo2 className="h-4 w-4" />
                            </button>
                          )}
                        </span>
                      </li>
                    ))}
                  </ul>
                </section>
              );
            })
          )}
        </div>
      </div>

      <Dialog open={dialog} onOpenChange={setDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Record payment</DialogTitle>
            <DialogDescription>
              {chosen.length} booking{chosen.length === 1 ? "" : "s"}, {totalLabel(chosen.map((b) => ({ cents: amount(b), currency: b.money?.currency ?? "GBP" })))} in total. The talent will see these as paid.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Field label="Paid on">
              <Input type="date" value={paidOn} max={new Date().toISOString().slice(0, 10)} onChange={(e) => setPaidOn(e.target.value)} />
            </Field>
            <Field label="Reference (optional)" hint="e.g. bank transfer reference">
              <Input value={reference} onChange={(e) => setReference(e.target.value)} />
            </Field>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(false)}>
              Cancel
            </Button>
            <Button onClick={markPaid} disabled={saving} className="bg-gold text-black hover:bg-gold/90">
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Mark as paid
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SimpleMainLayout>
  );
}
