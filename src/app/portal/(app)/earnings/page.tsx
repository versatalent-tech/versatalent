"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { Loader2 } from "lucide-react";
import type { EarningsSummary } from "@/lib/portal/types";
import { api, errorMessage, formatMoney } from "@/components/crm/shared";

export default function PortalEarningsPage() {
  const [data, setData] = useState<EarningsSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<EarningsSummary>("/api/portal/earnings").then(setData).catch((err) => setError(errorMessage(err)));
  }, []);

  if (error) return <p className="rounded border border-red-200 bg-red-50 p-4 text-red-800">{error}</p>;
  if (!data) return <Loader2 className="mx-auto mt-16 h-8 w-8 animate-spin text-gold" />;

  const year = new Date().getFullYear();
  const totals = data.currency_totals.length ? data.currency_totals : [{ currency: "GBP", earned_this_year: 0, upcoming: 0 }];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Earnings</h1>
        <p className="text-sm text-gray-500">What you receive for confirmed and completed bookings.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl bg-black p-5 text-white">
          <p className="text-sm text-gray-400">Earned in {year}</p>
          {totals.map((t) => (
            <p key={t.currency} className="text-3xl font-bold">
              {formatMoney(t.earned_this_year, t.currency)}
            </p>
          ))}
        </div>
        <div className="rounded-xl border bg-white p-5">
          <p className="text-sm text-gray-500">Coming up (confirmed)</p>
          {totals.map((t) => (
            <p key={t.currency} className="text-3xl font-bold">
              {formatMoney(t.upcoming, t.currency)}
            </p>
          ))}
        </div>
      </div>

      {data.bookings.length === 0 ? (
        <p className="rounded-xl border bg-white p-8 text-center text-sm text-gray-500">No paid bookings yet.</p>
      ) : (
        <ul className="divide-y rounded-xl border bg-white">
          {data.bookings.map((b) => (
            <li key={b.id} className="flex items-center justify-between gap-3 p-4">
              <div className="min-w-0">
                <p className="truncate font-medium">{b.title}</p>
                <p className="text-sm text-gray-500">
                  {format(new Date(b.starts_at), "d MMM yyyy")}
                  {new Date(b.starts_at) > new Date() ? " · upcoming" : ""}
                </p>
              </div>
              <p className="flex-shrink-0 font-semibold">{formatMoney(b.net_cents, b.currency)}</p>
            </li>
          ))}
        </ul>
      )}
      <p className="text-xs text-gray-500">Amounts are after the agency&apos;s commission. Questions about a payment? Contact your manager.</p>
    </div>
  );
}
