"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { AlertTriangle, Loader2, Plus, Receipt, Save } from "lucide-react";
import { SimpleMainLayout } from "@/components/layout/SimpleMainLayout";
import { AdminBackLink } from "@/components/admin/AdminBackLink";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useBridgeCardTaps } from "@/lib/hooks/useBridgeCardTaps";
import {
  BENEFIT_STATUSES,
  IN_PERSON_METHODS,
  PAID_MEMBERSHIP_STATUSES,
  formatMoney,
  type BenefitStatus,
  type FoundingSettings,
  type InPersonMethod,
  type MembershipBenefit,
  type PaidMembership,
} from "@/lib/membership/founding";
import type { FoundingPayment, FoundingStats, MembershipFilter } from "@/lib/db/repositories/founding";
import { api, errorMessage, selectClass } from "@/components/crm/shared";

type Tab = "members" | "payments" | "benefits";

const FILTERS: { key: MembershipFilter; label: string }[] = [
  { key: "current", label: "Active" },
  { key: "expiring", label: "Ending in 30 days" },
  { key: "pending", label: "Awaiting payment" },
  { key: "refund", label: "Refund needed" },
  { key: "ended", label: "Ended" },
  { key: "all", label: "All" },
];

const day = (value: string | null) => (value ? format(new Date(value), "d MMM yyyy") : "–");
const number = (n: number | null) => (n ? `No. ${String(n).padStart(3, "0")}` : "–");

function Stat({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="rounded-lg border bg-white p-4">
      <p className="text-xs uppercase tracking-wide text-gray-500">{label}</p>
      <p className="text-2xl font-semibold tabular-nums">{value}</p>
      {hint && <p className="text-xs text-gray-500">{hint}</p>}
    </div>
  );
}

function SettingsPanel({ settings, termsVersion, onSaved }: { settings: FoundingSettings; termsVersion: string; onSaved: (s: FoundingSettings) => void }) {
  const [price, setPrice] = useState((settings.founding_price_cents / 100).toFixed(2));
  const [cap, setCap] = useState(String(settings.founding_cap));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const draftTerms = termsVersion.includes("draft");

  const save = async (changes: Partial<FoundingSettings>, confirmText?: string) => {
    if (confirmText && !window.confirm(confirmText)) return;
    setSaving(true);
    setError(null);
    try {
      onSaved(await api<FoundingSettings>("/api/admin/founding", { method: "PUT", json: changes }));
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-3 rounded-lg border bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <label className="flex items-center gap-3">
          <Switch
            checked={settings.founding_on_sale}
            disabled={saving}
            onCheckedChange={(on) =>
              save(
                { founding_on_sale: on },
                on
                  ? `Put the Founding Membership on sale online?${draftTerms ? "\n\nThe terms are still marked as a draft." : ""}`
                  : "Pause online sales? Existing members keep their benefits."
              )
            }
          />
          <span>
            <span className="block font-medium">{settings.founding_on_sale ? "On sale online" : "Online sales paused"}</span>
            <span className="block text-xs text-gray-500">In-person sales below work either way.</span>
          </span>
        </label>
        <div className="flex flex-wrap items-end gap-3">
          <label className="text-sm">
            <span className="mb-1 block text-xs text-gray-500">Price (£)</span>
            <Input value={price} onChange={(e) => setPrice(e.target.value)} inputMode="decimal" className="w-24" />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-xs text-gray-500">Founding places</span>
            <Input value={cap} onChange={(e) => setCap(e.target.value)} inputMode="numeric" className="w-24" />
          </label>
          <Button
            variant="outline"
            disabled={saving}
            onClick={() => {
              const cents = Math.round(parseFloat(price) * 100);
              const places = parseInt(cap, 10);
              if (!Number.isFinite(cents) || !Number.isFinite(places)) return setError("Enter a price and a number of places");
              save({ founding_price_cents: cents, founding_cap: places }, `Save: ${formatMoney(cents)} for 12 months, ${places} founding places? A new price applies to purchases from now on.`);
            }}
          >
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Save
          </Button>
        </div>
      </div>
      {draftTerms && (
        <p className="flex items-start gap-2 rounded bg-amber-50 p-2 text-xs text-amber-900">
          <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
          The terms are a draft ({termsVersion}). Have them approved and set the final version on the Membership cards page before
          selling.
        </p>
      )}
      {error && <p className="text-sm text-red-700">{error}</p>}
    </div>
  );
}

function SaleDialog({ settings, onClose, onDone }: { settings: FoundingSettings; onClose: () => void; onDone: (message: string) => void }) {
  const [lookup, setLookup] = useState("");
  const [method, setMethod] = useState<InPersonMethod>("sumup_reader");
  const [reference, setReference] = useState("");
  const [price, setPrice] = useState((settings.founding_price_cents / 100).toFixed(2));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { state } = useBridgeCardTaps((uid) => setLookup(uid.toUpperCase()));

  const submit = async () => {
    setSaving(true);
    setError(null);
    const value = lookup.trim();
    try {
      const result = await api<PaidMembership>("/api/admin/founding/sales", {
        method: "POST",
        json: {
          ...(value.includes("@") ? { email: value } : { card_uid: value }),
          method,
          reference,
          price_cents: Math.round(parseFloat(price) * 100),
        },
      });
      onDone(`${result.member.name} is Founding Member ${number(result.founding_number)}, until ${day(result.ends_at)}.`);
    } catch (err) {
      setError(errorMessage(err));
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Record an in-person sale</DialogTitle>
          <DialogDescription>Take the payment first (card reader, SumUp app or cash), then record it here.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <label className="block text-sm">
            <span className="mb-1 block font-medium">Member&apos;s email or card UID</span>
            <Input value={lookup} onChange={(e) => setLookup(e.target.value)} placeholder="name@example.com or tap their card" />
            {state === "ready" && <span className="mt-1 block text-xs text-gray-500">Card reader ready: tap their card.</span>}
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium">Paid by</span>
            <select className={selectClass} value={method} onChange={(e) => setMethod(e.target.value as InPersonMethod)}>
              {Object.entries(IN_PERSON_METHODS).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-sm">
              <span className="mb-1 block font-medium">Amount (£)</span>
              <Input value={price} onChange={(e) => setPrice(e.target.value)} inputMode="decimal" />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-medium">Receipt / transaction</span>
              <Input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Optional" />
            </label>
          </div>
          {error && <p className="text-sm text-red-700">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={saving || !lookup.trim()} className="bg-gold text-black hover:bg-gold/90">
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Record sale
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function MembersTab({ refreshKey, onChanged }: { refreshKey: number; onChanged: () => void }) {
  const [filter, setFilter] = useState<MembershipFilter>("current");
  const [rows, setRows] = useState<PaidMembership[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await api<{ memberships: PaidMembership[] }>(`/api/admin/founding?filter=${filter}`);
      setRows(data.memberships);
      setError(null);
    } catch (err) {
      setError(errorMessage(err));
    }
  }, [filter]);

  useEffect(() => {
    setRows(null);
    load();
  }, [load, refreshKey]);

  const act = async (m: PaidMembership, body: Record<string, unknown>) => {
    try {
      await api(`/api/admin/founding/${m.id}`, { method: "POST", json: body });
      load();
      onChanged();
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`rounded-full border px-3 py-1 text-sm ${filter === f.key ? "border-black bg-black text-white" : "bg-white text-gray-600"}`}
          >
            {f.label}
          </button>
        ))}
      </div>
      {error && <p className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}
      {!rows ? (
        <Loader2 className="mx-auto mt-10 h-8 w-8 animate-spin text-gold" />
      ) : rows.length === 0 ? (
        <p className="rounded-lg border bg-white p-10 text-center text-sm text-gray-500">Nothing here.</p>
      ) : (
        <ul className="space-y-3">
          {rows.map((m) => (
            <li key={m.id} className="flex flex-col gap-3 rounded-lg border bg-white p-4 md:flex-row md:items-start md:justify-between">
              <div className="min-w-0 space-y-1">
                <p className="flex flex-wrap items-center gap-2 font-semibold">
                  <span className="font-mono text-sm text-gold">{number(m.founding_number)}</span>
                  {m.member.name}
                  <span
                    className={`rounded px-2 py-0.5 text-xs font-normal ${
                      m.is_current ? "bg-green-100 text-green-800" : m.status === "active" ? "bg-blue-100 text-blue-800" : "bg-gray-100"
                    }`}
                  >
                    {m.is_upcoming ? "Renewal (starts later)" : PAID_MEMBERSHIP_STATUSES[m.status]}
                  </span>
                  {m.needs_refund && <span className="rounded bg-red-100 px-2 py-0.5 text-xs font-normal text-red-800">Refund an extra payment</span>}
                </p>
                <p className="text-sm text-gray-700">
                  {m.starts_at ? `${day(m.starts_at)} – ${day(m.ends_at)}` : `Started ${day(m.created_at)}, not paid`}
                  {m.paid_at ? ` · ${formatMoney(m.price_cents, m.currency)} ${m.source === "online" ? "online" : `in person (${IN_PERSON_METHODS[m.payment_method as InPersonMethod] ?? m.payment_method})`}` : ""}
                </p>
                <p className="truncate text-xs text-gray-500">
                  {m.member.email}
                  {m.sumup_transaction_code ? ` · SumUp ${m.sumup_transaction_code}` : ""}
                  {m.payment_reference ? ` · ref ${m.payment_reference}` : ""}
                  {m.terms_version ? ` · terms ${m.terms_version}` : ""} · {m.benefits.length} benefits
                </p>
                {m.notes && <p className="whitespace-pre-line text-xs italic text-gray-500">{m.notes}</p>}
              </div>
              <div className="flex flex-shrink-0 flex-wrap gap-2">
                <Button size="sm" variant="outline" asChild>
                  <Link href={`/vip/${m.member.id}`} target="_blank">
                    Pass
                  </Link>
                </Button>
                {m.needs_refund && (
                  <Button size="sm" variant="outline" onClick={() => window.confirm("Have you refunded the extra payment in SumUp?") && act(m, { action: "refund_done" })}>
                    Refund done
                  </Button>
                )}
                {(m.status === "active" || m.status === "expired" || m.status === "cancelled") && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const note = window.prompt(`Refund ${m.member.name}? Refund ${formatMoney(m.price_cents)} (or the agreed amount) in SumUp first. Add a note (optional).`);
                      if (note !== null) act(m, { action: "refunded", note });
                    }}
                  >
                    <Receipt className="mr-1 h-4 w-4" /> Refunded
                  </Button>
                )}
                {(m.status === "active" || m.status === "pending" || m.status === "payment_failed") && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-red-700"
                    onClick={() => {
                      const note = window.prompt(`Cancel ${m.member.name}'s membership? Benefits stop now. Add a note (optional).`);
                      if (note !== null) act(m, { action: "cancel", note });
                    }}
                  >
                    Cancel
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function PaymentsTab() {
  const [rows, setRows] = useState<FoundingPayment[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<FoundingPayment[]>("/api/admin/founding/payments")
      .then(setRows)
      .catch((err) => setError(errorMessage(err)));
  }, []);

  if (error) return <p className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>;
  if (!rows) return <Loader2 className="mx-auto mt-10 h-8 w-8 animate-spin text-gold" />;

  const problems = rows.filter((r) => r.problem).length;
  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-600">
        Every payment taken, matched to the membership it paid for. Online payments should match SumUp&apos;s transaction list by
        transaction code.
        {problems > 0 && <span className="font-medium text-red-700"> {problems} need attention.</span>}
      </p>
      {rows.length === 0 ? (
        <p className="rounded-lg border bg-white p-10 text-center text-sm text-gray-500">No payments yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border bg-white">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
              <tr>
                <th className="px-3 py-2">Paid</th>
                <th className="px-3 py-2">Member</th>
                <th className="px-3 py-2 text-right">Amount</th>
                <th className="px-3 py-2">How</th>
                <th className="px-3 py-2">Transaction</th>
                <th className="px-3 py-2">Membership</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={`${r.kind}-${r.key}`} className={`border-t ${r.problem ? "bg-red-50" : ""}`}>
                  <td className="whitespace-nowrap px-3 py-2">{format(new Date(r.paid_at), "d MMM yyyy HH:mm")}</td>
                  <td className="px-3 py-2">{r.member_name}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{formatMoney(r.amount_cents, r.currency)}</td>
                  <td className="px-3 py-2">{r.kind === "online" ? "Online" : IN_PERSON_METHODS[r.method as InPersonMethod] ?? r.method}</td>
                  <td className="px-3 py-2 font-mono text-xs">{r.transaction_code ?? "–"}</td>
                  <td className="px-3 py-2">
                    {PAID_MEMBERSHIP_STATUSES[r.membership_status as keyof typeof PAID_MEMBERSHIP_STATUSES] ?? r.membership_status}
                    {r.refunded && r.membership_status !== "refunded" && <span className="block text-xs text-gray-500">Extra payment, refunded</span>}
                    {r.problem && <span className="block text-xs text-red-700">{r.problem}</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const emptyBenefit = {
  title: "",
  description: "",
  limit_text: "",
  eligibility_text: "",
  owner: "",
  unit_cost: "",
  status: "active" as BenefitStatus,
  sort_order: "0",
};

function BenefitDialog({ benefit, onClose, onSaved }: { benefit: MembershipBenefit | null; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState(
    benefit
      ? {
          title: benefit.title,
          description: benefit.description ?? "",
          limit_text: benefit.limit_text ?? "",
          eligibility_text: benefit.eligibility_text ?? "",
          owner: benefit.owner ?? "",
          unit_cost: benefit.unit_cost_cents === null ? "" : (benefit.unit_cost_cents / 100).toFixed(2),
          status: benefit.status,
          sort_order: String(benefit.sort_order),
        }
      : emptyBenefit
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const json = {
        title: form.title,
        description: form.description,
        limit_text: form.limit_text,
        eligibility_text: form.eligibility_text,
        owner: form.owner,
        unit_cost_cents: form.unit_cost.trim() === "" ? null : Math.round(parseFloat(form.unit_cost) * 100),
        status: form.status,
        sort_order: parseInt(form.sort_order, 10) || 0,
      };
      await api(benefit ? `/api/admin/founding/benefits/${benefit.id}` : "/api/admin/founding/benefits", {
        method: benefit ? "PUT" : "POST",
        json,
      });
      onSaved();
    } catch (err) {
      setError(errorMessage(err));
      setSaving(false);
    }
  };

  const field = (key: keyof typeof form, label: string, hint?: string) => (
    <label className="block text-sm">
      <span className="mb-1 block font-medium">{label}</span>
      <Input value={form[key]} onChange={set(key)} />
      {hint && <span className="mt-1 block text-xs text-gray-500">{hint}</span>}
    </label>
  );

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{benefit ? "Edit benefit" : "Add a benefit"}</DialogTitle>
          <DialogDescription>Changes apply to purchases from now on. Members who have already paid keep what they bought.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          {field("title", "Title")}
          <label className="block text-sm">
            <span className="mb-1 block font-medium">What members get</span>
            <textarea value={form.description} onChange={set("description")} rows={2} className="w-full rounded-md border px-3 py-2 text-sm" />
          </label>
          {field("limit_text", "Limit", "Shown to members, e.g. 2 per membership year")}
          {field("eligibility_text", "Eligibility", "Shown to members, e.g. 18+")}
          <div className="grid grid-cols-2 gap-3">
            {field("owner", "Owner", "Internal")}
            {field("unit_cost", "Cost per use (£)", "Internal; blank if not per use")}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-sm">
              <span className="mb-1 block font-medium">Status</span>
              <select className={selectClass} value={form.status} onChange={set("status")}>
                {Object.entries(BENEFIT_STATUSES).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            {field("sort_order", "Order")}
          </div>
          {error && <p className="text-sm text-red-700">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save} disabled={saving || !form.title.trim()} className="bg-gold text-black hover:bg-gold/90">
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function BenefitsTab() {
  const [rows, setRows] = useState<MembershipBenefit[] | null>(null);
  const [editing, setEditing] = useState<MembershipBenefit | "new" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    api<MembershipBenefit[]>("/api/admin/founding/benefits")
      .then(setRows)
      .catch((err) => setError(errorMessage(err)));
  }, []);
  useEffect(load, [load]);

  if (error) return <p className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>;
  if (!rows) return <Loader2 className="mx-auto mt-10 h-8 w-8 animate-spin text-gold" />;

  const offered = rows.filter((b) => b.status === "active");
  const perMemberCost = offered.reduce((sum, b) => sum + (b.unit_cost_cents ?? 0), 0);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-gray-600">
          {offered.length} benefits offered on new purchases. Cost if each per-use benefit is used once:{" "}
          <span className="font-medium">{formatMoney(perMemberCost)}</span> per member.
        </p>
        <Button onClick={() => setEditing("new")} className="bg-gold text-black hover:bg-gold/90">
          <Plus className="mr-1 h-4 w-4" /> Add benefit
        </Button>
      </div>
      <ul className="space-y-2">
        {rows.map((b) => (
          <li key={b.id} className={`flex flex-col gap-2 rounded-lg border bg-white p-4 sm:flex-row sm:items-start sm:justify-between ${b.status !== "active" ? "opacity-60" : ""}`}>
            <div className="min-w-0 space-y-1">
              <p className="flex flex-wrap items-center gap-2 font-semibold">
                {b.title}
                <span className={`rounded px-2 py-0.5 text-xs font-normal ${b.status === "active" ? "bg-green-100 text-green-800" : "bg-gray-100"}`}>
                  {BENEFIT_STATUSES[b.status]}
                </span>
              </p>
              {b.description && <p className="text-sm text-gray-700">{b.description}</p>}
              <p className="text-xs text-gray-500">
                {[b.limit_text, b.eligibility_text, b.owner ? `Owner: ${b.owner}` : null, b.unit_cost_cents !== null ? `Cost ${formatMoney(b.unit_cost_cents)} per use` : null]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            </div>
            <Button size="sm" variant="outline" onClick={() => setEditing(b)}>
              Edit
            </Button>
          </li>
        ))}
      </ul>
      {editing && (
        <BenefitDialog
          benefit={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            load();
          }}
        />
      )}
    </div>
  );
}

export default function FoundingMembersPage() {
  const [tab, setTab] = useState<Tab>("members");
  const [settings, setSettings] = useState<FoundingSettings | null>(null);
  const [termsVersion, setTermsVersion] = useState("");
  const [stats, setStats] = useState<FoundingStats | null>(null);
  const [selling, setSelling] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const loadSummary = useCallback(async () => {
    const data = await api<{ settings: FoundingSettings; terms_version: string; stats: FoundingStats }>("/api/admin/founding?filter=pending");
    setSettings(data.settings);
    setTermsVersion(data.terms_version);
    setStats(data.stats);
  }, []);

  useEffect(() => {
    loadSummary().catch(() => undefined);
  }, [loadSummary]);

  return (
    <SimpleMainLayout>
      <section className="bg-gradient-to-br from-black via-gray-900 to-black py-10 md:py-12">
        <div className="container mx-auto px-4">
          <AdminBackLink />
          <h1 className="mb-1 text-3xl font-bold text-white md:text-4xl">
            V•PRIVILEGE <span className="text-gold">Founding</span>
          </h1>
          <p className="text-gray-300">
            Paid memberships: 12 months, one-off payment, no auto-renewal.{" "}
            <Link href="/membership#founding" target="_blank" className="underline hover:text-gold">
              View the public page
            </Link>
          </p>
        </div>
      </section>

      <div className="min-h-[50vh] bg-gray-50 py-6">
        <div className="container mx-auto space-y-4 px-4">
          {stats && settings && (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
              <Stat label="Active members" value={stats.current} />
              <Stat label="Founding places" value={`${stats.numbers_assigned} / ${stats.cap}`} hint="numbers given out" />
              <Stat label="Ending in 30 days" value={stats.expiring_30_days} hint="not yet renewed" />
              <Stat label="Refunds to do" value={stats.needs_refund} />
              <Stat
                label="Taken, last 12 months"
                value={stats.revenue.length ? stats.revenue.map((r) => formatMoney(r.cents, r.currency)).join(" + ") : formatMoney(0)}
                hint="excluding refunds"
              />
            </div>
          )}
          {settings && <SettingsPanel settings={settings} termsVersion={termsVersion} onSaved={setSettings} />}
          {notice && <p className="rounded border border-green-200 bg-green-50 p-3 text-sm text-green-900">{notice}</p>}

          <div className="flex flex-wrap items-center justify-between gap-3 border-b">
            <div className="flex gap-1">
              {(
                [
                  ["members", "Members"],
                  ["payments", "Payments check"],
                  ["benefits", "Benefits"],
                ] as const
              ).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setTab(key)}
                  className={`-mb-px border-b-2 px-3 py-2 text-sm ${tab === key ? "border-gold font-medium" : "border-transparent text-gray-500"}`}
                >
                  {label}
                </button>
              ))}
            </div>
            {settings && (
              <Button size="sm" variant="outline" onClick={() => setSelling(true)} className="mb-2">
                <Receipt className="mr-1 h-4 w-4" /> Record in-person sale
              </Button>
            )}
          </div>

          {tab === "members" && <MembersTab refreshKey={refreshKey} onChanged={() => loadSummary().catch(() => undefined)} />}
          {tab === "payments" && <PaymentsTab key={refreshKey} />}
          {tab === "benefits" && <BenefitsTab />}
        </div>
      </div>

      {selling && settings && (
        <SaleDialog
          settings={settings}
          onClose={() => setSelling(false)}
          onDone={(message) => {
            setSelling(false);
            setNotice(message);
            setRefreshKey((k) => k + 1);
            loadSummary().catch(() => undefined);
          }}
        />
      )}
    </SimpleMainLayout>
  );
}
