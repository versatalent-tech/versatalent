"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { TeamRate } from "@/lib/bookings/types";
import { api, errorMessage } from "@/components/crm/shared";

type TeamRates = { people: TeamRate[]; overLimit: { talent: string; percent: number }[] };

const ROLE_LABELS = { manager: "Manager", road_manager: "Road manager" } as const;

const shown = (pct: number | null) => (pct == null ? "" : String(pct));

/** Commission Rates → Team: each manager's and road manager's share of the agency's commission (admins only) */
export function TeamRatesSection() {
  const [data, setData] = useState<TeamRates | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const apply = (next: TeamRates) => {
    setData(next);
    setValues(Object.fromEntries(next.people.map((p) => [p.id, shown(p.share_percent)])));
  };

  useEffect(() => {
    api<TeamRates>("/api/team-rates")
      .then(apply)
      .catch((err) => setError(errorMessage(err)));
  }, []);

  const dirty = (data?.people ?? []).some((p) => shown(p.share_percent) !== values[p.id]);

  const save = async () => {
    if (!data) return;
    setError(null);
    const rates = [];
    for (const person of data.people) {
      const raw = values[person.id]?.trim() ?? "";
      const pct = raw === "" ? null : Number(raw);
      if (pct !== null && (Number.isNaN(pct) || pct < 0 || pct > 100)) {
        setError(`${person.name}: enter a percentage between 0 and 100, or leave it empty`);
        return;
      }
      rates.push({ user_id: person.id, share_percent: pct });
    }
    setSaving(true);
    try {
      apply(await api<TeamRates>("/api/team-rates", { method: "PUT", json: { rates } }));
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="space-y-3 pt-6">
      <div>
        <h2 className="text-xl font-bold">Team</h2>
        <p className="text-sm text-gray-600">
          A share of the agency&apos;s commission on each booking for the talents they look after. New bookings take the current rate;
          existing bookings keep theirs.
        </p>
      </div>
      {error && <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</div>}
      {data?.overLimit.map((o) => (
        <p key={o.talent} className="flex items-start gap-2 rounded border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
          {o.talent}: the people looking after them add up to {o.percent}% of the commission.
        </p>
      ))}
      {!data ? (
        !error && <Loader2 className="mx-auto h-6 w-6 animate-spin text-gold" />
      ) : data.people.length === 0 ? (
        <p className="rounded-lg border bg-white p-6 text-center text-sm text-gray-500">No managers or road managers yet.</p>
      ) : (
        <>
          <ul className="divide-y overflow-hidden rounded-lg border bg-white">
            {data.people.map((person) => (
              <li key={person.id} className="flex items-center justify-between gap-4 px-4 py-3">
                <div className="min-w-0">
                  <label htmlFor={`team-rate-${person.id}`} className={`font-medium ${person.is_active ? "" : "text-gray-400"}`}>
                    {person.name}
                  </label>
                  <p className="truncate text-xs text-gray-500">
                    {ROLE_LABELS[person.role]}
                    {!person.is_active && " (inactive)"}
                    {person.talents.length > 0 ? ` · ${person.talents.join(", ")}` : " · no talents yet"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    id={`team-rate-${person.id}`}
                    inputMode="decimal"
                    className="w-24 text-right"
                    placeholder="Not set"
                    value={values[person.id] ?? ""}
                    onChange={(e) => setValues((v) => ({ ...v, [person.id]: e.target.value }))}
                  />
                  <span className="text-gray-500">%</span>
                </div>
              </li>
            ))}
          </ul>
          <div className="flex items-center justify-end gap-3">
            {saved && (
              <span className="flex items-center gap-1 text-sm text-green-700">
                <Check className="h-4 w-4" /> Saved
              </span>
            )}
            <Button onClick={save} disabled={saving || !dirty} className="bg-gold text-black hover:bg-gold/90">
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save team rates
            </Button>
          </div>
        </>
      )}
    </section>
  );
}
