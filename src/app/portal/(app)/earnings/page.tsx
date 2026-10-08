"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { Loader2 } from "lucide-react";
import type { EarningsSummary, TalentBooking } from "@/lib/portal/types";
import { api, errorMessage, formatMoney } from "@/components/crm/shared";

const SECTIONS: { key: TalentBooking["payout"]; title: string; empty: string }[] = [
  { key: "owed", title: "Owed to you", empty: "Nothing owed right now." },
  { key: "upcoming", title: "Coming up", empty: "No confirmed paid jobs coming up." },
  { key: "paid", title: "Paid", empty: "No payments in the last year." },
];

export default function PortalEarningsPage() {
  const [data, setData] = useState<EarningsSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<EarningsSummary>("/api/portal/earnings").then(setData).catch((err) => setError(errorMessage(err)));
  }, []);

  if (error) return <p className="rounded border border-red-200 bg-red-50 p-4 text-red-800">{error}</p>;
  if (!data) return <Loader2 className="mx-auto mt-16 h-8 w-8 animate-spin text-gold" />;

  const year = new Date().getFullYear();
  const totals = data.currency_totals.length ? data.currency_totals : [{ currency: "GBP", paid_this_year: 0, owed: 0, upcoming: 0 }];
  const sum = (pick: (t: (typeof totals)[number]) => number) => totals.map((t) => formatMoney(pick(t), t.currency)).join(" + ");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Earnings</h1>
        <p className="text-sm text-gray-500">What you receive after the agency&apos;s commission.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl bg-black p-5 text-white">
          <p className="text-sm text-gray-400">Paid to you in {year}</p>
          <p className="text-3xl font-bold">{sum((t) => t.paid_this_year)}</p>
        </div>
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">
          <p className="text-sm text-amber-800">Owed to you</p>
          <p className="text-3xl font-bold text-amber-900">{sum((t) => t.owed)}</p>
          <p className="text-xs text-amber-800">Jobs done, payment on its way</p>
        </div>
        <div className="rounded-xl border bg-white p-5">
          <p className="text-sm text-gray-500">Coming up</p>
          <p className="text-3xl font-bold">{sum((t) => t.upcoming)}</p>
          <p className="text-xs text-gray-500">Confirmed jobs still to do</p>
        </div>
      </div>

      {SECTIONS.map((section) => {
        const items = data.bookings.filter((b) => b.payout === section.key);
        return (
          <section key={section.key} className="space-y-2">
            <h2 className="text-lg font-semibold">{section.title}</h2>
            {items.length === 0 ? (
              <p className="rounded-xl border bg-white p-4 text-sm text-gray-500">{section.empty}</p>
            ) : (
              <ul className="divide-y rounded-xl border bg-white">
                {items.map((b) => (
                  <li key={b.id} className="flex items-center justify-between gap-3 p-4">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{b.title}</p>
                      <p className="text-sm text-gray-500">
                        {format(new Date(b.starts_at), "d MMM yyyy")}
                        {b.payout === "paid" && b.paid_at ? ` · paid ${format(new Date(b.paid_at), "d MMM yyyy")}` : ""}
                      </p>
                    </div>
                    <p className="flex-shrink-0 font-semibold">
                      {formatMoney(b.payout === "paid" ? b.paid_cents : b.net_cents, b.currency)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        );
      })}

      <p className="text-xs text-gray-500">Questions about a payment? Contact your manager.</p>
    </div>
  );
}
