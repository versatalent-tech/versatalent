"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SimpleMainLayout } from "@/components/layout/SimpleMainLayout";
import type { TalentRate } from "@/lib/bookings/types";
import { api, errorMessage } from "@/components/crm/shared";

export default function CommissionRatesPage() {
  const [rates, setRates] = useState<TalentRate[]>([]);
  const [values, setValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const apply = (list: TalentRate[]) => {
    setRates(list);
    setValues(Object.fromEntries(list.map((r) => [r.id, r.commission_percent == null ? "" : String(r.commission_percent)])));
  };

  useEffect(() => {
    api<TalentRate[]>("/api/talent-rates")
      .then(apply)
      .catch((err) => setError(errorMessage(err)))
      .finally(() => setLoading(false));
  }, []);

  const dirty = rates.some((r) => (r.commission_percent == null ? "" : String(r.commission_percent)) !== values[r.id]);

  const save = async () => {
    setError(null);
    const payload = [];
    for (const rate of rates) {
      const raw = values[rate.id]?.trim() ?? "";
      const pct = raw === "" ? null : Number(raw);
      if (pct !== null && (Number.isNaN(pct) || pct < 0 || pct > 100)) {
        setError(`${rate.name}: enter a percentage between 0 and 100, or leave it empty`);
        return;
      }
      payload.push({ talent_id: rate.id, commission_percent: pct });
    }
    setSaving(true);
    try {
      apply(await api<TalentRate[]>("/api/talent-rates", { method: "PUT", json: { rates: payload } }));
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
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
            Commission <span className="text-gold">Rates</span>
          </h1>
          <p className="max-w-2xl text-gray-300">
            The agency&apos;s share of each talent&apos;s fee. New bookings take the current rate; existing bookings keep the rate they were
            made with.
          </p>
        </div>
      </section>

      <div className="min-h-[50vh] bg-gray-50 py-8">
        <div className="container mx-auto max-w-2xl space-y-4 px-4">
          {error && <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</div>}
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-gold" />
            </div>
          ) : (
            <>
              <ul className="divide-y overflow-hidden rounded-lg border bg-white">
                {rates.map((rate) => (
                  <li key={rate.id} className="flex items-center justify-between gap-4 px-4 py-3">
                    <label htmlFor={`rate-${rate.id}`} className={`font-medium ${rate.is_active ? "" : "text-gray-400"}`}>
                      {rate.name}
                      {!rate.is_active && <span className="ml-2 text-xs font-normal">(inactive)</span>}
                    </label>
                    <div className="flex items-center gap-2">
                      <Input
                        id={`rate-${rate.id}`}
                        inputMode="decimal"
                        className="w-24 text-right"
                        placeholder="Not set"
                        value={values[rate.id] ?? ""}
                        onChange={(e) => setValues((v) => ({ ...v, [rate.id]: e.target.value }))}
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
                  Save rates
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </SimpleMainLayout>
  );
}
