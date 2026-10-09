"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { Loader2, Save } from "lucide-react";
import { SimpleMainLayout } from "@/components/layout/SimpleMainLayout";
import { AdminBackLink } from "@/components/admin/AdminBackLink";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { REFERRAL_FLAGS, REFERRAL_STATUSES, type Referral, type ReferralSettings, type ReferralStatus } from "@/lib/referrals/types";
import { api, errorMessage } from "@/components/crm/shared";

interface Data {
  open: boolean;
  settings: ReferralSettings;
  referrals: Referral[];
}

const FILTERS: { key: ReferralStatus | "all"; label: string }[] = [
  { key: "review", label: "Needs review" },
  { key: "pending", label: "Waiting for first visit" },
  { key: "approved", label: "Approved" },
  { key: "rejected", label: "Rejected" },
  { key: "all", label: "All" },
];

function SettingsPanel({ data, onSaved }: { data: Data; onSaved: (d: { open: boolean; settings: ReferralSettings }) => void }) {
  const [form, setForm] = useState({
    referrer_points: String(data.settings.referrer_points),
    referee_points: String(data.settings.referee_points),
    min_order: (data.settings.min_order_cents / 100).toFixed(2),
    yearly_cap: String(data.settings.yearly_cap),
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const save = async (json: Record<string, unknown>, confirmText?: string) => {
    if (confirmText && !window.confirm(confirmText)) return;
    setSaving(true);
    setError(null);
    try {
      onSaved(await api("/api/admin/referrals", { method: "PUT", json }));
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const field = (key: keyof typeof form, label: string) => (
    <label className="text-sm">
      <span className="mb-1 block text-xs text-gray-500">{label}</span>
      <Input value={form[key]} onChange={set(key)} inputMode="decimal" className="w-28" />
    </label>
  );

  return (
    <div className="space-y-3 rounded-lg border bg-white p-4">
      <label className="flex items-center gap-3">
        <Switch
          checked={data.open}
          disabled={saving}
          onCheckedChange={(on) =>
            save({ open: on }, on ? "Open referrals? Members see their code on their pass and new members can enter one." : "Close referrals? Codes stop working for new sign-ups; nothing already approved changes.")
          }
        />
        <span>
          <span className="block font-medium">{data.open ? "Referrals open" : "Referrals closed"}</span>
          <span className="block text-xs text-gray-500">
            A referral is approved when the friend&apos;s first visit is verified: a staff check-in, or a paid till order of at least the
            minimum.
          </span>
        </span>
      </label>
      <div className="flex flex-wrap items-end gap-3">
        {field("referrer_points", "Points for the referrer")}
        {field("referee_points", "Points for the friend")}
        {field("min_order", "Minimum till order (£)")}
        {field("yearly_cap", "Approved per member a year")}
        <Button
          variant="outline"
          disabled={saving}
          onClick={() =>
            save({
              settings: {
                referrer_points: parseInt(form.referrer_points, 10) || 0,
                referee_points: parseInt(form.referee_points, 10) || 0,
                min_order_cents: Math.round((parseFloat(form.min_order) || 0) * 100),
                yearly_cap: parseInt(form.yearly_cap, 10) || 0,
              },
            })
          }
        >
          <Save className="mr-2 h-4 w-4" /> Save
        </Button>
      </div>
      <p className="text-xs text-gray-500">
        Points are reward points (to spend), never status points. Referrals go to review when the friend shares the referrer&apos;s
        phone number or address, or when the referrer has reached the yearly limit. Members can&apos;t use their own code.
      </p>
      {error && <p className="text-sm text-red-700">{error}</p>}
    </div>
  );
}

export default function ReferralsPage() {
  const [filter, setFilter] = useState<ReferralStatus | "all">("review");
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setData(await api<Data>(`/api/admin/referrals?status=${filter}`));
    } catch (err) {
      setError(errorMessage(err));
    }
  }, [filter]);
  useEffect(() => {
    load();
  }, [load]);

  const decide = async (r: Referral, decision: "approved" | "rejected") => {
    let reason: string | null = null;
    if (decision === "rejected") {
      reason = window.prompt(`Reject the referral of ${r.referee.name} by ${r.referrer.name}? Reason:`);
      if (reason === null) return;
    } else if (!window.confirm(`Approve? ${r.referrer.name} gets ${data?.settings.referrer_points ?? 0} reward points.`)) {
      return;
    }
    try {
      await api(`/api/admin/referrals/${r.id}`, { method: "POST", json: { decision, reason: reason || undefined } });
      load();
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  return (
    <SimpleMainLayout>
      <section className="bg-gradient-to-br from-black via-gray-900 to-black py-10 md:py-12">
        <div className="container mx-auto px-4">
          <AdminBackLink />
          <h1 className="mb-1 text-3xl font-bold text-white md:text-4xl">
            <span className="text-gold">Referrals</span>
          </h1>
          <p className="text-gray-300">Members invite friends with their code; they earn reward points when the friend comes to an event.</p>
        </div>
      </section>

      <div className="min-h-[50vh] bg-gray-50 py-6">
        <div className="container mx-auto space-y-4 px-4">
          {error && <p className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}
          {!data ? (
            <Loader2 className="mx-auto mt-10 h-8 w-8 animate-spin text-gold" />
          ) : (
            <>
              <SettingsPanel data={data} onSaved={(d) => setData({ ...data, ...d })} />
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
              {data.referrals.length === 0 ? (
                <p className="rounded-lg border bg-white p-10 text-center text-sm text-gray-500">Nothing here.</p>
              ) : (
                <ul className="space-y-2">
                  {data.referrals.map((r) => (
                    <li key={r.id} className="flex flex-col gap-3 rounded-lg border bg-white p-4 md:flex-row md:items-start md:justify-between">
                      <div className="min-w-0 space-y-1">
                        <p className="flex flex-wrap items-center gap-2 font-semibold">
                          <Link href={`/vip/${r.referee.id}`} target="_blank" className="hover:underline">
                            {r.referee.name}
                          </Link>
                          <span className="text-sm font-normal text-gray-500">referred by</span>
                          <Link href={`/vip/${r.referrer.id}`} target="_blank" className="hover:underline">
                            {r.referrer.name}
                          </Link>
                          <span className={`rounded px-2 py-0.5 text-xs font-normal ${r.status === "approved" ? "bg-green-100 text-green-800" : r.status === "review" ? "bg-amber-100 text-amber-800" : "bg-gray-100"}`}>
                            {REFERRAL_STATUSES[r.status]}
                          </span>
                        </p>
                        <p className="text-xs text-gray-500">
                          Code {r.code} · joined {format(new Date(r.created_at), "d MMM yyyy")}
                          {r.qualified_at ? ` · first visit ${format(new Date(r.qualified_at), "d MMM")} (${r.qualified_by === "order" ? "till order" : "check-in"})` : ""}
                          {r.status === "approved" ? ` · ${r.referrer_points} pts${r.referee_points ? ` + ${r.referee_points} pts to the friend` : ""}` : ""}
                        </p>
                        {r.flags.length > 0 && (
                          <ul className="text-xs text-amber-800">
                            {r.flags.map((f) => (
                              <li key={f}>⚠ {REFERRAL_FLAGS[f] ?? f}</li>
                            ))}
                          </ul>
                        )}
                        {r.reject_reason && <p className="text-xs italic text-gray-500">{r.reject_reason}</p>}
                      </div>
                      {(r.status === "review" || r.status === "pending") && (
                        <div className="flex flex-shrink-0 gap-2">
                          {r.status === "review" && (
                            <Button size="sm" className="bg-gold text-black hover:bg-gold/90" onClick={() => decide(r, "approved")}>
                              Approve
                            </Button>
                          )}
                          <Button size="sm" variant="ghost" className="text-red-700" onClick={() => decide(r, "rejected")}>
                            Reject
                          </Button>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </div>
      </div>
    </SimpleMainLayout>
  );
}
