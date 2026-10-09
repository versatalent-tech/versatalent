"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { format, formatDistanceToNow } from "date-fns";
import { Loader2, Nfc, Package, Printer, Send, X } from "lucide-react";
import { SimpleMainLayout } from "@/components/layout/SimpleMainLayout";
import { AdminBackLink } from "@/components/admin/AdminBackLink";
import { WriteCardUrl } from "@/components/admin/nfc/WriteCardUrl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useBridgeCardTaps } from "@/lib/hooks/useBridgeCardTaps";
import {
  CARD_REQUEST_STATUSES,
  PAYMENT_STATUSES,
  type CardRequest,
  type CardRequestStatus,
  type ProgrammeSettings,
} from "@/lib/membership/types";
import { api, errorMessage } from "@/components/crm/shared";

type Filter = "open" | CardRequestStatus | "all";
const FILTERS: { key: Filter; label: string }[] = [
  { key: "open", label: "To post" },
  { key: "awaiting_payment", label: "Awaiting payment" },
  { key: "posted", label: "Posted" },
  { key: "cancelled", label: "Cancelled" },
  { key: "all", label: "All" },
];

interface Counts {
  to_post: number;
  card_assigned: number;
  awaiting_payment: number;
  founding_interest: number;
}

const money = (cents: number) => new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(cents / 100);

function AssignCardDialog({ request, onClose, onDone }: { request: CardRequest; onClose: () => void; onDone: () => void }) {
  const [uid, setUid] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [assigned, setAssigned] = useState<string | null>(null);
  const { state, readerName } = useBridgeCardTaps((tapped) => !assigned && setUid(tapped.toUpperCase()), { paused: Boolean(assigned) });

  const assign = async () => {
    setSaving(true);
    setError(null);
    try {
      await api(`/api/admin/card-requests/${request.id}`, { method: "POST", json: { action: "assign_card", card_uid: uid } });
      setAssigned(uid.trim().toUpperCase());
      onDone();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Card for {request.recipient_name}</DialogTitle>
          <DialogDescription>Place a new, unused card on the reader, or type its UID.</DialogDescription>
        </DialogHeader>
        {assigned ? (
          <div className="space-y-3">
            <p className="text-sm text-green-700">Card {assigned} is now linked to this member.</p>
            <WriteCardUrl cardUid={assigned} />
          </div>
        ) : (
          <div className="space-y-3">
            <p className="flex items-center gap-2 text-sm text-gray-600">
              <Nfc className="h-4 w-4 text-gold" />
              {state === "ready"
                ? `Reader ready${readerName ? ` (${readerName})` : ""}: tap the card`
                : state === "no-reader"
                  ? "NFC Bridge is running but no reader is plugged in"
                  : state === "connecting"
                    ? "Connecting to the NFC Bridge…"
                    : "NFC Bridge not running: type the UID instead"}
            </p>
            <Input value={uid} onChange={(e) => setUid(e.target.value)} placeholder="Card UID, e.g. 04A1B2C3D4E5F6" className="font-mono uppercase" />
            {error && <p className="text-sm text-red-700">{error}</p>}
          </div>
        )}
        <DialogFooter>
          {assigned ? (
            <Button onClick={onClose}>Done</Button>
          ) : (
            <>
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button onClick={assign} disabled={saving || !uid.trim()} className="bg-gold text-black hover:bg-gold/90">
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Link card
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SettingsPanel({ settings, counts, onSaved }: { settings: ProgrammeSettings; counts: Counts; onSaved: (s: ProgrammeSettings) => void }) {
  const [fee, setFee] = useState(String(settings.card_delivery_fee_cents / 100));
  const [terms, setTerms] = useState(settings.terms_version);
  const [error, setError] = useState<string | null>(null);

  const save = async (changes: Partial<ProgrammeSettings>) => {
    setError(null);
    try {
      onSaved(await api<ProgrammeSettings>("/api/admin/membership-settings", { method: "PUT", json: changes }));
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  const toggleOpen = (open: boolean) => {
    if (open && settings.terms_version.includes("draft")) {
      if (!window.confirm("The membership terms are still marked as a draft. Open sign-ups anyway?")) return;
    }
    save({ signup_open: open });
  };

  return (
    <section className="grid gap-4 rounded-lg border bg-white p-4 md:grid-cols-4">
      <div className="flex items-center justify-between gap-3 md:col-span-1 md:flex-col md:items-start">
        <div>
          <p className="font-medium">Sign-ups</p>
          <p className={`text-sm ${settings.signup_open ? "text-green-700" : "text-gray-500"}`}>
            {settings.signup_open ? "Open on /membership" : "Closed"}
          </p>
        </div>
        <Switch checked={settings.signup_open} onCheckedChange={toggleOpen} aria-label="Sign-ups open" />
      </div>
      <div>
        <label className="text-sm font-medium" htmlFor="fee">
          Card delivery fee (£)
        </label>
        <div className="mt-1 flex gap-2">
          <Input id="fee" inputMode="decimal" value={fee} onChange={(e) => setFee(e.target.value)} className="w-24" />
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const cents = Math.round(Number(fee) * 100);
              if (!Number.isFinite(cents) || cents < 0) return setError("Enter a valid amount");
              save({ card_delivery_fee_cents: cents });
            }}
          >
            Save
          </Button>
        </div>
      </div>
      <div>
        <label className="text-sm font-medium" htmlFor="terms">
          Terms version
        </label>
        <div className="mt-1 flex gap-2">
          <Input id="terms" value={terms} onChange={(e) => setTerms(e.target.value)} className="w-40" />
          <Button variant="outline" size="sm" onClick={() => save({ terms_version: terms })}>
            Save
          </Button>
        </div>
        <p className="mt-1 text-xs text-gray-500">
          Contains “draft” = draft banner shown. <Link href="/membership/terms" className="underline" target="_blank">View terms</Link>
        </p>
      </div>
      <div className="text-sm text-gray-600">
        <p>
          <strong>{counts.founding_interest}</strong> interested in Founding Membership
        </p>
        <p>
          <strong>{counts.awaiting_payment}</strong> started but not paid
        </p>
      </div>
      {error && <p className="text-sm text-red-700 md:col-span-4">{error}</p>}
    </section>
  );
}

export default function MembershipCardsPage() {
  const [filter, setFilter] = useState<Filter>("open");
  const [requests, setRequests] = useState<CardRequest[] | null>(null);
  const [counts, setCounts] = useState<Counts | null>(null);
  const [settings, setSettings] = useState<ProgrammeSettings | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [assigning, setAssigning] = useState<CardRequest | null>(null);
  const [writing, setWriting] = useState<CardRequest | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await api<{ requests: CardRequest[]; counts: Counts; settings: ProgrammeSettings }>(`/api/admin/card-requests?status=${filter}`);
      setRequests(data.requests);
      setCounts(data.counts);
      setSettings(data.settings);
      setError(null);
    } catch (err) {
      setError(errorMessage(err));
    }
  }, [filter]);

  useEffect(() => {
    setRequests(null);
    setSelected(new Set());
    load();
  }, [load]);

  const act = async (request: CardRequest, body: Record<string, unknown>, confirmText?: string) => {
    if (confirmText && !window.confirm(confirmText)) return;
    try {
      await api(`/api/admin/card-requests/${request.id}`, { method: "POST", json: body });
      load();
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  const printLabels = () => {
    const ids = [...selected].join(",");
    window.open(`/admin/membership-cards/labels?ids=${encodeURIComponent(ids)}`, "_blank");
  };

  return (
    <SimpleMainLayout>
      <section className="bg-gradient-to-br from-black via-gray-900 to-black py-10 md:py-12">
        <div className="container mx-auto px-4">
          <AdminBackLink />
          <h1 className="mb-1 text-3xl font-bold text-white md:text-4xl">
            Membership <span className="text-gold">Cards</span>
          </h1>
          <p className="text-gray-300">
            Online applications: link a card, write it, post it.{" "}
            <Link href="/membership" target="_blank" className="underline hover:text-gold">
              View the public page
            </Link>
          </p>
        </div>
      </section>

      <div className="min-h-[50vh] bg-gray-50 py-6">
        <div className="container mx-auto space-y-4 px-4">
          {settings && counts && <SettingsPanel settings={settings} counts={counts} onSaved={setSettings} />}

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2">
              {FILTERS.map((f) => (
                <button
                  key={f.key}
                  onClick={() => setFilter(f.key)}
                  className={`rounded-full border px-3 py-1 text-sm ${filter === f.key ? "border-black bg-black text-white" : "bg-white text-gray-600"}`}
                >
                  {f.label}
                  {f.key === "open" && counts ? ` (${counts.to_post + counts.card_assigned})` : ""}
                  {f.key === "awaiting_payment" && counts?.awaiting_payment ? ` (${counts.awaiting_payment})` : ""}
                </button>
              ))}
            </div>
            {filter === "open" && (
              <Button variant="outline" onClick={printLabels} disabled={selected.size === 0}>
                <Printer className="mr-2 h-4 w-4" />
                Print {selected.size || ""} label{selected.size === 1 ? "" : "s"}
              </Button>
            )}
          </div>

          {error && <p className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}

          {!requests ? (
            <Loader2 className="mx-auto mt-10 h-8 w-8 animate-spin text-gold" />
          ) : requests.length === 0 ? (
            <p className="rounded-lg border bg-white p-10 text-center text-sm text-gray-500">
              {filter === "open" ? "No cards waiting to be posted." : "Nothing here."}
            </p>
          ) : (
            <ul className="space-y-3">
              {requests.map((r) => (
                <li key={r.id} className="flex flex-col gap-4 rounded-lg border bg-white p-4 md:flex-row md:items-start md:justify-between">
                  <div className="flex min-w-0 gap-3">
                    {filter === "open" && (
                      <input
                        type="checkbox"
                        aria-label={`Select ${r.recipient_name}`}
                        checked={selected.has(r.id)}
                        onChange={(e) =>
                          setSelected((s) => {
                            const next = new Set(s);
                            if (e.target.checked) next.add(r.id);
                            else next.delete(r.id);
                            return next;
                          })
                        }
                        className="mt-1 h-4 w-4 flex-shrink-0 accent-[#D4AF37]"
                      />
                    )}
                    <div className="min-w-0 space-y-1">
                      <p className="flex flex-wrap items-center gap-2 font-semibold">
                        {r.recipient_name}
                        <span className="rounded bg-gray-100 px-2 py-0.5 text-xs font-normal">{CARD_REQUEST_STATUSES[r.status]}</span>
                        <span
                          className={`rounded px-2 py-0.5 text-xs font-normal ${
                            r.payment_status === "paid" || r.payment_status === "waived" ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          {PAYMENT_STATUSES[r.payment_status]}
                          {r.payment_status === "paid" ? ` ${money(r.fee_cents)}` : ""}
                        </span>
                        {r.founding_interest && <span className="rounded bg-gold/20 px-2 py-0.5 text-xs font-normal">Founding interest</span>}
                        {r.needs_refund && <span className="rounded bg-red-100 px-2 py-0.5 text-xs font-normal text-red-800">Refund a duplicate payment</span>}
                      </p>
                      <address className="text-sm not-italic text-gray-700">
                        {r.address_line1}
                        {r.address_line2 ? `, ${r.address_line2}` : ""}, {r.city} {r.postcode}
                      </address>
                      <p className="truncate text-xs text-gray-500">
                        {r.member.email}
                        {r.member.phone ? ` · ${r.member.phone}` : ""} · applied {formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}
                        {r.card ? ` · card ${r.card.uid}` : ""}
                        {r.posted_at ? ` · posted ${format(new Date(r.posted_at), "d MMM")}` : ""}
                        {r.tracking_reference ? ` · ${r.tracking_reference}` : ""}
                        {r.sumup_transaction_code ? ` · SumUp ${r.sumup_transaction_code}` : ""}
                      </p>
                      {r.notes && <p className="text-xs italic text-gray-500">{r.notes}</p>}
                    </div>
                  </div>
                  <div className="flex flex-shrink-0 flex-wrap gap-2">
                    {r.needs_refund && (
                      <Button size="sm" variant="outline" onClick={() => act(r, { action: "refund_done" }, "Have you refunded the extra payment in SumUp?")}>
                        Refund done
                      </Button>
                    )}
                    {r.status === "awaiting_payment" && (
                      <Button size="sm" variant="outline" onClick={() => act(r, { action: "waive_fee" }, `Waive the delivery fee for ${r.recipient_name}? Their membership starts now.`)}>
                        Waive fee
                      </Button>
                    )}
                    {r.status === "to_post" && (
                      <Button size="sm" onClick={() => setAssigning(r)} className="bg-gold text-black hover:bg-gold/90">
                        <Nfc className="mr-1 h-4 w-4" /> Link card
                      </Button>
                    )}
                    {r.status === "card_assigned" && (
                      <>
                        <Button size="sm" variant="outline" onClick={() => setWriting(r)}>
                          <Package className="mr-1 h-4 w-4" /> Write card
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => {
                            const tracking = window.prompt("Tracking reference (optional)") ?? "";
                            act(r, { action: "mark_posted", tracking_reference: tracking });
                          }}
                          className="bg-gold text-black hover:bg-gold/90"
                        >
                          <Send className="mr-1 h-4 w-4" /> Mark posted
                        </Button>
                      </>
                    )}
                    {r.status !== "posted" && r.status !== "cancelled" && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-red-700"
                        onClick={() => {
                          const note = window.prompt(`Cancel ${r.recipient_name}'s request? Add a note (optional).`);
                          if (note === null) return;
                          const refunded =
                            r.payment_status === "paid" &&
                            window.confirm("Have you refunded the delivery fee in SumUp? OK = mark as refunded, Cancel = leave as paid.");
                          act(r, { action: "cancel", note, refunded });
                        }}
                      >
                        <X className="mr-1 h-4 w-4" /> Cancel
                      </Button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {assigning && <AssignCardDialog request={assigning} onClose={() => setAssigning(null)} onDone={load} />}
      {writing?.card && (
        <Dialog open onOpenChange={(open) => !open && setWriting(null)}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Write card for {writing.recipient_name}</DialogTitle>
              <DialogDescription>Put card {writing.card.uid} on the reader.</DialogDescription>
            </DialogHeader>
            <WriteCardUrl cardUid={writing.card.uid} />
            <DialogFooter>
              <Button onClick={() => setWriting(null)}>Done</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </SimpleMainLayout>
  );
}
