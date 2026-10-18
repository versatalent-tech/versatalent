"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { AlertTriangle, CheckCircle2, Loader2, Plus, Save } from "lucide-react";
import { SimpleMainLayout } from "@/components/layout/SimpleMainLayout";
import { AdminBackLink } from "@/components/admin/AdminBackLink";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  CLAIM_STATUSES,
  REWARD_KINDS,
  formatClaimCode,
  type BalanceCheck,
  type LoyaltySettings,
  type RewardClaim,
  type RewardKind,
  type RewardsReport,
  type RewardWithUsage,
  type UpcomingEvent,
} from "@/lib/loyalty/types";
import { api, errorMessage, selectClass } from "@/components/crm/shared";

type Tab = "rewards" | "claims" | "report" | "balances";
const money = (cents: number) => new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(cents / 100);

function Stat({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="rounded-lg border bg-white p-4">
      <p className="text-xs uppercase tracking-wide text-gray-500">{label}</p>
      <p className="text-2xl font-semibold tabular-nums">{value}</p>
      {hint && <p className="text-xs text-gray-500">{hint}</p>}
    </div>
  );
}

function SettingsPanel({ settings, onSaved }: { settings: LoyaltySettings; onSaved: (s: LoyaltySettings) => void }) {
  const [percent, setPercent] = useState(String(settings.reward_earn_percent));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async (changes: Partial<LoyaltySettings>, confirmText?: string) => {
    if (confirmText && !window.confirm(confirmText)) return;
    setSaving(true);
    setError(null);
    try {
      onSaved(await api<LoyaltySettings>("/api/admin/rewards", { method: "PUT", json: changes }));
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-2 rounded-lg border bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <label className="flex items-center gap-3">
          <Switch
            checked={settings.rewards_open}
            disabled={saving}
            onCheckedChange={(on) =>
              save(
                { rewards_open: on },
                on ? "Open rewards? Members can claim active rewards on their pass, and staff can give them." : "Close rewards? Nobody can claim; codes already claimed can still be used."
              )
            }
          />
          <span>
            <span className="block font-medium">{settings.rewards_open ? "Rewards open" : "Rewards closed"}</span>
            <span className="block text-xs text-gray-500">Emergency stop: closing stops new claims straight away.</span>
          </span>
        </label>
        <div className="flex items-end gap-2">
          <label className="text-sm">
            <span className="mb-1 block text-xs text-gray-500">Reward points earned (% of status points)</span>
            <Input value={percent} onChange={(e) => setPercent(e.target.value)} inputMode="numeric" className="w-24" />
          </label>
          <Button
            variant="outline"
            disabled={saving}
            onClick={() => {
              const value = parseInt(percent, 10);
              if (!Number.isFinite(value)) return setError("Enter a whole number");
              save({ reward_earn_percent: value }, `Members will earn ${value} reward points for every 100 status points from now on. Continue?`);
            }}
          >
            <Save className="mr-2 h-4 w-4" /> Save
          </Button>
        </div>
      </div>
      <p className="text-xs text-gray-500">
        Check-ins and purchases earn status points (they decide the tier) and reward points (to spend). Status points reset each
        membership year; reward points don&apos;t.
      </p>
      {error && <p className="text-sm text-red-700">{error}</p>}
    </div>
  );
}

type Form = Record<string, string | boolean>;

function toForm(r: RewardWithUsage | null): Form {
  const s = (v: number | null | undefined) => (v === null || v === undefined ? "" : String(v));
  return {
    title: r?.title ?? "",
    description: r?.description ?? "",
    kind: r?.kind ?? "drink",
    point_cost: s(r?.point_cost ?? 0),
    unit_cost: r?.unit_cost_cents === null || r?.unit_cost_cents === undefined ? "" : (r.unit_cost_cents / 100).toFixed(2),
    stock: s(r?.stock),
    per_member_limit: s(r?.per_member_limit),
    limit_period: r?.limit_period ?? "ever",
    requires_event: r?.requires_event ?? false,
    per_event_cap: s(r?.per_event_cap),
    book_hours_before: s(r?.book_hours_before ?? 0),
    needs_guest_name: r?.needs_guest_name ?? false,
    min_tier: r?.min_tier ?? "",
    founding_only: r?.founding_only ?? false,
    birthday_month_only: r?.birthday_month_only ?? false,
    claim_valid_days: s(r?.claim_valid_days ?? 30),
    valid_from: r?.valid_from ?? "",
    valid_until: r?.valid_until ?? "",
    is_active: r?.is_active ?? false,
    sort_order: s(r?.sort_order ?? 0),
  };
}

function RewardDialog({ reward, events, onClose, onSaved }: { reward: RewardWithUsage | null; events: UpcomingEvent[]; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState<Form>(toForm(reward));
  const [eventIds, setEventIds] = useState<string[]>(reward?.event_ids ?? []);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const text = (key: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));
  const flag = (key: string) => (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [key]: e.target.checked }));
  const int = (key: string) => (String(form[key]).trim() === "" ? null : parseInt(String(form[key]), 10));

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const json = {
        title: form.title,
        description: form.description,
        kind: form.kind,
        point_cost: int("point_cost") ?? 0,
        unit_cost_cents: String(form.unit_cost).trim() === "" ? null : Math.round(parseFloat(String(form.unit_cost)) * 100),
        stock: int("stock"),
        per_member_limit: int("per_member_limit"),
        limit_period: form.limit_period,
        requires_event: form.requires_event,
        event_ids: form.requires_event && eventIds.length ? eventIds : null,
        per_event_cap: form.requires_event ? int("per_event_cap") : null,
        book_hours_before: int("book_hours_before") ?? 0,
        needs_guest_name: form.needs_guest_name,
        min_tier: form.min_tier || null,
        founding_only: form.founding_only,
        birthday_month_only: form.birthday_month_only,
        claim_valid_days: int("claim_valid_days") ?? 30,
        valid_from: form.valid_from || null,
        valid_until: form.valid_until || null,
        is_active: form.is_active,
        sort_order: int("sort_order") ?? 0,
      };
      await api(reward ? `/api/admin/rewards/${reward.id}` : "/api/admin/rewards", { method: reward ? "PUT" : "POST", json });
      onSaved();
    } catch (err) {
      setError(errorMessage(err));
      setSaving(false);
    }
  };

  const field = (key: string, label: string, hint?: string, type = "text") => (
    <label className="block text-sm">
      <span className="mb-1 block font-medium">{label}</span>
      <Input type={type} value={String(form[key])} onChange={text(key)} />
      {hint && <span className="mt-1 block text-xs text-gray-500">{hint}</span>}
    </label>
  );
  const check = (key: string, label: string) => (
    <label className="flex items-center gap-2 text-sm">
      <input type="checkbox" checked={Boolean(form[key])} onChange={flag(key)} className="h-4 w-4 accent-[#D4AF37]" />
      {label}
    </label>
  );

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{reward ? "Edit reward" : "Add a reward"}</DialogTitle>
          <DialogDescription>Changes apply to new claims. Claims already made keep their points and dates.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          {field("title", "Title")}
          <label className="block text-sm">
            <span className="mb-1 block font-medium">Description (members see this)</span>
            <textarea value={String(form.description)} onChange={text("description")} rows={2} className="w-full rounded-md border px-3 py-2 text-sm" />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-sm">
              <span className="mb-1 block font-medium">Type</span>
              <select className={selectClass} value={String(form.kind)} onChange={text("kind")}>
                {Object.entries(REWARD_KINDS).map(([k, label]) => (
                  <option key={k} value={k}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            {field("point_cost", "Point cost", "0 = included (e.g. Founding benefits)")}
            {field("unit_cost", "Our cost per use (£)", "For the cost report")}
            {field("stock", "Total available", "Blank = unlimited")}
            {field("per_member_limit", "Per member", "Blank = no limit")}
            <label className="block text-sm">
              <span className="mb-1 block font-medium">Limit period</span>
              <select className={selectClass} value={String(form.limit_period)} onChange={text("limit_period")}>
                <option value="ever">Ever</option>
                <option value="year">Per membership year</option>
              </select>
            </label>
            {field("claim_valid_days", "Days to use it", "After claiming (event rewards: until the day after the event)")}
            <label className="block text-sm">
              <span className="mb-1 block font-medium">Minimum tier</span>
              <select className={selectClass} value={String(form.min_tier)} onChange={text("min_tier")}>
                <option value="">Any</option>
                <option value="gold">Gold and Black</option>
                <option value="black">Black only</option>
              </select>
            </label>
            {field("valid_from", "Available from", undefined, "date")}
            {field("valid_until", "Available until", undefined, "date")}
          </div>
          <div className="space-y-2 rounded-lg border p-3">
            {check("requires_event", "Used at a specific event (member chooses the event)")}
            {form.requires_event && (
              <div className="space-y-3 pl-6">
                <div className="grid grid-cols-2 gap-3">
                  {field("per_event_cap", "Places per event", "Blank = no cap")}
                  {field("book_hours_before", "Claim at least (hours before)")}
                </div>
                {events.length > 0 && (
                  <div className="text-sm">
                    <p className="mb-1 font-medium">Only at these events (none ticked = any upcoming event)</p>
                    <div className="max-h-32 space-y-1 overflow-y-auto">
                      {events.map((e) => (
                        <label key={e.id} className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={eventIds.includes(e.id)}
                            onChange={(ev) => setEventIds((ids) => (ev.target.checked ? [...ids, e.id] : ids.filter((i) => i !== e.id)))}
                            className="h-4 w-4 accent-[#D4AF37]"
                          />
                          {e.title} · {format(new Date(e.start_time), "d MMM")}
                        </label>
                      ))}
                    </div>
                  </div>
                )}
                {check("needs_guest_name", "Needs a guest's name (guest passes)")}
              </div>
            )}
            {check("founding_only", "V•PRIVILEGE Founding Members only")}
            {check("birthday_month_only", "Only in the member's birthday month")}
          </div>
          <div className="grid grid-cols-2 gap-3">
            {field("sort_order", "Order")}
            <div className="flex items-end pb-2">{check("is_active", "On (members can claim it)")}</div>
          </div>
          {error && <p className="text-sm text-red-700">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save} disabled={saving || !String(form.title).trim()} className="bg-gold text-black hover:bg-gold/90">
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function rules(r: RewardWithUsage): string {
  return [
    r.per_member_limit ? `${r.per_member_limit} per member${r.limit_period === "year" ? " a year" : ""}` : null,
    r.stock !== null ? `${r.stock} in total` : null,
    r.requires_event ? `event${r.per_event_cap ? `, ${r.per_event_cap} per event` : ""}${r.book_hours_before ? `, ${r.book_hours_before}h ahead` : ""}` : null,
    r.needs_guest_name ? "guest named" : null,
    r.min_tier ? `${r.min_tier}+` : null,
    r.founding_only ? "Founding only" : null,
    r.birthday_month_only ? "birthday month" : null,
    r.unit_cost_cents !== null ? `costs us ${money(r.unit_cost_cents)}` : null,
  ]
    .filter(Boolean)
    .join(" · ");
}

function ClaimsTab({ rewards }: { rewards: RewardWithUsage[] }) {
  const [filter, setFilter] = useState<"open" | "redeemed" | "closed" | "all">("open");
  const [reward, setReward] = useState("");
  const [rows, setRows] = useState<RewardClaim[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setRows(await api<RewardClaim[]>(`/api/admin/rewards/claims?filter=${filter}${reward ? `&reward=${reward}` : ""}`));
    } catch (err) {
      setError(errorMessage(err));
    }
  }, [filter, reward]);
  useEffect(() => {
    setRows(null);
    load();
  }, [load]);

  const cancel = async (c: RewardClaim) => {
    const reason = window.prompt(`Cancel ${c.member.name}'s ${c.reward_title}?${c.points_held ? ` ${c.points_held} points go back.` : ""} Reason:`);
    if (reason === null) return;
    try {
      await api("/api/staff/rewards", { method: "POST", json: { action: "cancel", claim_id: c.id, reason: reason || undefined } });
      load();
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {(["open", "redeemed", "closed", "all"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-full border px-3 py-1 text-sm ${filter === f ? "border-black bg-black text-white" : "bg-white text-gray-600"}`}
          >
            {{ open: "Ready to use", redeemed: "Used", closed: "Cancelled / expired", all: "All" }[f]}
          </button>
        ))}
        <select className={`${selectClass} w-auto`} value={reward} onChange={(e) => setReward(e.target.value)}>
          <option value="">All rewards</option>
          {rewards.map((r) => (
            <option key={r.id} value={r.id}>
              {r.title}
            </option>
          ))}
        </select>
      </div>
      {error && <p className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}
      {!rows ? (
        <Loader2 className="mx-auto mt-10 h-8 w-8 animate-spin text-gold" />
      ) : rows.length === 0 ? (
        <p className="rounded-lg border bg-white p-10 text-center text-sm text-gray-500">No claims.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border bg-white">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
              <tr>
                <th className="px-3 py-2">Claimed</th>
                <th className="px-3 py-2">Member</th>
                <th className="px-3 py-2">Reward</th>
                <th className="px-3 py-2">Code</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => (
                <tr key={c.id} className="border-t align-top">
                  <td className="whitespace-nowrap px-3 py-2">{format(new Date(c.created_at), "d MMM HH:mm")}</td>
                  <td className="px-3 py-2">
                    <Link href={`/vip/${c.member.id}`} target="_blank" className="hover:underline">
                      {c.member.name}
                    </Link>
                  </td>
                  <td className="px-3 py-2">
                    {c.reward_title}
                    {c.points_held > 0 && <span className="text-gray-500"> · {c.points_held} pts</span>}
                    {c.event && <span className="block text-xs text-gray-500">{c.event.title} · {format(new Date(c.event.start_time), "d MMM")}</span>}
                    {c.guest_name && <span className="block text-xs text-gray-500">Guest: {c.guest_name}</span>}
                    {c.claimed_by_staff && <span className="block text-xs text-gray-500">Given by staff</span>}
                  </td>
                  <td className="px-3 py-2 font-mono text-xs">{formatClaimCode(c.code)}</td>
                  <td className="px-3 py-2">
                    {CLAIM_STATUSES[c.status]}
                    <span className="block text-xs text-gray-500">
                      {c.status === "reserved"
                        ? `until ${format(new Date(c.expires_at), "d MMM")}`
                        : c.redeemed_at
                          ? format(new Date(c.redeemed_at), "d MMM HH:mm")
                          : c.close_reason ?? ""}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right">
                    {c.status === "reserved" && (
                      <Button size="sm" variant="ghost" className="text-red-700" onClick={() => cancel(c)}>
                        Cancel
                      </Button>
                    )}
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

function ReportTab({ report, rewards }: { report: RewardsReport; rewards: RewardWithUsage[] }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Points members hold" value={report.points_outstanding.toLocaleString("en-GB")} hint={`${report.members} active members`} />
        <Stat label="Claims ready to use" value={report.open_claims} hint={`would cost us ${money(report.open_claims_cost_cents)}`} />
        <Stat label="Used, last 30 days" value={report.redeemed_30d} hint={`cost us ${money(report.redeemed_cost_30d_cents)}`} />
        <Stat
          label="Redemption rate"
          value={report.redemption_rate === null ? "–" : `${Math.round(report.redemption_rate * 100)}%`}
          hint="used ÷ (used + expired + cancelled)"
        />
        <Stat label="Claimed, last 30 days" value={report.claimed_30d} />
        <Stat label="Expired, last 30 days" value={report.expired_30d} hint="points went back" />
        <Stat label="Points earned, 30 days" value={report.points_earned_30d.toLocaleString("en-GB")} hint="reward points" />
        <Stat label="Points spent, 30 days" value={report.points_spent_30d.toLocaleString("en-GB")} hint="net of returns" />
      </div>
      <div className="overflow-x-auto rounded-lg border bg-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
            <tr>
              <th className="px-3 py-2">Reward</th>
              <th className="px-3 py-2 text-right">Ready</th>
              <th className="px-3 py-2 text-right">Used</th>
              <th className="px-3 py-2 text-right">Expired</th>
              <th className="px-3 py-2 text-right">Cancelled</th>
              <th className="px-3 py-2 text-right">Cost of used</th>
            </tr>
          </thead>
          <tbody>
            {rewards.map((r) => (
              <tr key={r.id} className="border-t">
                <td className="px-3 py-2">{r.title}</td>
                <td className="px-3 py-2 text-right tabular-nums">{r.reserved}</td>
                <td className="px-3 py-2 text-right tabular-nums">{r.redeemed}</td>
                <td className="px-3 py-2 text-right tabular-nums">{r.expired}</td>
                <td className="px-3 py-2 text-right tabular-nums">{r.cancelled}</td>
                <td className="px-3 py-2 text-right tabular-nums">{r.unit_cost_cents === null ? "–" : money(r.unit_cost_cents * r.redeemed)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function BalancesTab() {
  const [data, setData] = useState<{ checked: number; mismatches: BalanceCheck[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    api<{ checked: number; mismatches: BalanceCheck[] }>("/api/admin/rewards/balances")
      .then(setData)
      .catch((err) => setError(errorMessage(err)));
  }, []);
  if (error) return <p className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>;
  if (!data) return <Loader2 className="mx-auto mt-10 h-8 w-8 animate-spin text-gold" />;
  return (
    <div className="space-y-3">
      {data.mismatches.length === 0 ? (
        <p className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 p-4 text-green-900">
          <CheckCircle2 className="h-5 w-5" /> All {data.checked} members&apos; status and reward balances match their ledgers.
        </p>
      ) : (
        <>
          <p className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-4 text-red-900">
            <AlertTriangle className="h-5 w-5" /> {data.mismatches.length} balance(s) don&apos;t match their ledger. Tell the developer.
          </p>
          <ul className="space-y-1 text-sm">
            {data.mismatches.map((m) => (
              <li key={`${m.user_id}-${m.ledger}`}>
                {m.name}: {m.ledger} balance {m.balance}, ledger total {m.ledger_sum}
              </li>
            ))}
          </ul>
        </>
      )}
      <p className="text-sm text-gray-600">
        To correct a balance, use VIP programme → Memberships → Adjust points. Every change is a ledger entry with a reason.
      </p>
    </div>
  );
}

export default function AdminRewardsPage() {
  const [tab, setTab] = useState<Tab>("rewards");
  const [data, setData] = useState<{ settings: LoyaltySettings; rewards: RewardWithUsage[]; report: RewardsReport; events: UpcomingEvent[] } | null>(null);
  const [editing, setEditing] = useState<RewardWithUsage | "new" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setData(await api("/api/admin/rewards"));
    } catch (err) {
      setError(errorMessage(err));
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  return (
    <SimpleMainLayout>
      <section className="bg-gradient-to-br from-black via-gray-900 to-black py-10 md:py-12">
        <div className="container mx-auto px-4">
          <AdminBackLink />
          <h1 className="mb-1 text-3xl font-bold text-white md:text-4xl">
            Rewards <span className="text-gold">&amp; points</span>
          </h1>
          <p className="text-gray-300">
            What members can spend their reward points on.{" "}
            <Link href="/staff/rewards" className="underline hover:text-gold">
              Open the staff redeem screen
            </Link>
          </p>
        </div>
      </section>

      <div className="min-h-[50vh] bg-gray-50 py-6">
        <div className="container mx-auto space-y-4 px-4">
          {error && <p className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}
          {!data ? (
            <Loader2 className="mx-auto mt-10 h-8 w-8 animate-spin text-gold" />
          ) : (
            <>
              <SettingsPanel settings={data.settings} onSaved={(settings) => setData({ ...data, settings })} />

              <div className="flex gap-1 border-b">
                {(
                  [
                    ["rewards", "Rewards"],
                    ["claims", "Claims"],
                    ["report", "Report"],
                    ["balances", "Balance check"],
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

              {tab === "rewards" && (
                <div className="space-y-3">
                  <div className="flex justify-end">
                    <Button onClick={() => setEditing("new")} className="bg-gold text-black hover:bg-gold/90">
                      <Plus className="mr-1 h-4 w-4" /> Add reward
                    </Button>
                  </div>
                  <ul className="space-y-2">
                    {data.rewards.map((r) => (
                      <li key={r.id} className={`flex flex-col gap-2 rounded-lg border bg-white p-4 sm:flex-row sm:items-start sm:justify-between ${r.is_active ? "" : "opacity-70"}`}>
                        <div className="min-w-0 space-y-1">
                          <p className="flex flex-wrap items-center gap-2 font-semibold">
                            {r.title}
                            <span className={`rounded px-2 py-0.5 text-xs font-normal ${r.is_active ? "bg-green-100 text-green-800" : "bg-gray-100"}`}>
                              {r.is_active ? "On" : "Off"}
                            </span>
                            <span className="rounded bg-gray-100 px-2 py-0.5 text-xs font-normal">{REWARD_KINDS[r.kind as RewardKind]}</span>
                          </p>
                          <p className="text-sm text-gray-700">
                            {r.point_cost > 0 ? `${r.point_cost.toLocaleString("en-GB")} points` : "Included (0 points)"}
                            {r.description ? ` · ${r.description}` : ""}
                          </p>
                          <p className="text-xs text-gray-500">{rules(r)}</p>
                          <p className="text-xs text-gray-500">
                            {r.reserved} ready · {r.redeemed} used · {r.expired} expired · {r.cancelled} cancelled
                          </p>
                        </div>
                        <Button size="sm" variant="outline" onClick={() => setEditing(r)}>
                          Edit
                        </Button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {tab === "claims" && <ClaimsTab rewards={data.rewards} />}
              {tab === "report" && <ReportTab report={data.report} rewards={data.rewards} />}
              {tab === "balances" && <BalancesTab />}
            </>
          )}
        </div>
      </div>

      {editing && data && (
        <RewardDialog
          reward={editing === "new" ? null : editing}
          events={data.events}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            load();
          }}
        />
      )}
    </SimpleMainLayout>
  );
}
