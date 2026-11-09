"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { CheckCircle2, Loader2, Undo2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { StaffShare } from "@/lib/bookings/types";
import { Field, api, errorMessage } from "@/components/crm/shared";
import { formatCurrency } from "@/lib/utils/formatting";

type View = "owed" | "paid";

const ROLE_LABELS = { manager: "Manager", road_manager: "Road manager" } as const;

const keyOf = (s: StaffShare) => `${s.booking_id}:${s.user_id}`;

/** "£1,200.00 + €300.00" (shares are small, so pence are shown) */
function totalLabel(items: StaffShare[]): string {
  const totals = new Map<string, number>();
  for (const i of items) totals.set(i.currency, (totals.get(i.currency) ?? 0) + i.amount_cents);
  return totals.size === 0 ? formatCurrency(0) : [...totals].map(([c, cents]) => formatCurrency(cents, c)).join(" + ");
}

/** Payouts → Team: managers' and road managers' shares of the agency's commission (admins only) */
export function TeamPayouts() {
  const [view, setView] = useState<View>("owed");
  const [shares, setShares] = useState<StaffShare[] | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [dialog, setDialog] = useState(false);
  const [paidOn, setPaidOn] = useState(() => new Date().toISOString().slice(0, 10));
  const [reference, setReference] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setShares(null);
    try {
      setShares(await api<StaffShare[]>(`/api/payouts/team?view=${view}`));
      setError(null);
    } catch (err) {
      setError(errorMessage(err));
    }
  }, [view]);

  useEffect(() => {
    setSelected(new Set());
    load();
  }, [load]);

  const byPerson = useMemo(() => {
    const groups = new Map<string, { name: string; role: StaffShare["role"]; items: StaffShare[] }>();
    for (const s of shares ?? []) {
      const g = groups.get(s.user_id) ?? { name: s.person_name, role: s.role, items: [] };
      g.items.push(s);
      groups.set(s.user_id, g);
    }
    return [...groups.entries()];
  }, [shares]);

  const chosen = (shares ?? []).filter((s) => selected.has(keyOf(s)));

  const toggle = (keys: string[], on: boolean) =>
    setSelected((current) => {
      const next = new Set(current);
      keys.forEach((k) => (on ? next.add(k) : next.delete(k)));
      return next;
    });

  const markPaid = async () => {
    setSaving(true);
    setError(null);
    try {
      const response = await fetch("/api/payouts/team/paid", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shares: chosen.map((s) => ({ booking_id: s.booking_id, user_id: s.user_id })), paid_on: paidOn, reference }),
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

  const undo = async (s: StaffShare) => {
    if (!window.confirm(`Remove the payment recorded for “${s.booking_title}” (${s.person_name})? It will show as owed again.`)) return;
    try {
      await api(`/api/payouts/team/${s.booking_id}/${s.user_id}`, { method: "DELETE" });
      load();
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  const remove = async (s: StaffShare) => {
    if (!window.confirm(`Remove ${s.person_name}'s share of “${s.booking_title}”? They won't be owed anything for this booking.`)) return;
    try {
      await api("/api/payouts/team/remove", { method: "POST", json: { booking_id: s.booking_id, user_id: s.user_id } });
      load();
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  return (
    <>
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
            Mark {chosen.length || ""} as paid{chosen.length ? ` · ${totalLabel(chosen)}` : ""}
          </Button>
        )}
      </div>

      {notice && <p className="rounded border border-green-200 bg-green-50 p-3 text-sm text-green-900">{notice}</p>}
      {error && <p className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}

      {!shares ? (
        <Loader2 className="mx-auto mt-10 h-8 w-8 animate-spin text-gold" />
      ) : byPerson.length === 0 ? (
        <p className="rounded-lg border bg-white p-10 text-center text-sm text-gray-500">
          {view === "owed" ? "Nothing to pay: every finished job's team share has been paid." : "No payments recorded recently."}
        </p>
      ) : (
        byPerson.map(([userId, group]) => {
          const keys = group.items.map(keyOf);
          const allOn = keys.every((k) => selected.has(k));
          return (
            <section key={userId} className="overflow-hidden rounded-lg border bg-white">
              <header className="flex items-center justify-between gap-3 border-b bg-gray-50 px-4 py-2">
                <label className="flex items-center gap-2 font-semibold">
                  {view === "owed" && (
                    <input type="checkbox" checked={allOn} onChange={(e) => toggle(keys, e.target.checked)} className="h-4 w-4 accent-[#D4AF37]" />
                  )}
                  <span>{group.name}</span>
                  <span className="text-xs font-normal text-gray-500">{ROLE_LABELS[group.role]}</span>
                </label>
                <span className="text-sm font-medium">{totalLabel(group.items)}</span>
              </header>
              <ul className="divide-y">
                {group.items.map((s) => (
                  <li key={keyOf(s)} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                    <label className="flex min-w-0 items-center gap-3">
                      {view === "owed" && (
                        <input
                          type="checkbox"
                          checked={selected.has(keyOf(s))}
                          onChange={(e) => toggle([keyOf(s)], e.target.checked)}
                          className="h-4 w-4 flex-shrink-0 accent-[#D4AF37]"
                        />
                      )}
                      <span className="min-w-0">
                        <span className="block truncate font-medium">{s.booking_title}</span>
                        <span className="block text-xs text-gray-500">
                          {s.talent_name} · {format(new Date(s.starts_at), "EEE d MMM yyyy")} · {s.share_percent}% of commission
                          {view === "paid" && s.paid_at ? ` · paid ${format(new Date(s.paid_at), "d MMM yyyy")}` : ""}
                          {view === "paid" && s.paid_reference ? ` · ref ${s.paid_reference}` : ""}
                        </span>
                      </span>
                    </label>
                    <span className="flex flex-shrink-0 items-center gap-2">
                      <span className="font-semibold">{formatCurrency(s.amount_cents, s.currency)}</span>
                      {view === "paid" ? (
                        <button onClick={() => undo(s)} aria-label="Undo payment" className="text-gray-400 hover:text-red-600">
                          <Undo2 className="h-4 w-4" />
                        </button>
                      ) : (
                        <button onClick={() => remove(s)} aria-label="Remove share" title="Remove share" className="text-gray-400 hover:text-red-600">
                          <X className="h-4 w-4" />
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

      <Dialog open={dialog} onOpenChange={setDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Record payment</DialogTitle>
            <DialogDescription>
              {chosen.length} share{chosen.length === 1 ? "" : "s"}, {totalLabel(chosen)} in total. They will see these as paid on their dashboard.
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
    </>
  );
}
