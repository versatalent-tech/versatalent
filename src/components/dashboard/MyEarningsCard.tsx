"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { Loader2 } from "lucide-react";
import type { MyEarning } from "@/lib/bookings/types";
import { api } from "@/components/crm/shared";
import { formatCurrency } from "@/lib/utils/formatting";

type Earnings = { owed: MyEarning[]; paid: MyEarning[]; upcoming: MyEarning[] };

/** "£40.00 + €10.00" */
function total(items: MyEarning[]): string {
  const totals = new Map<string, number>();
  for (const i of items) totals.set(i.currency, (totals.get(i.currency) ?? 0) + i.amount_cents);
  return totals.size === 0 ? formatCurrency(0) : [...totals].map(([c, cents]) => formatCurrency(cents, c)).join(" + ");
}

function EarningRow({ item, date }: { item: MyEarning; date: string }) {
  return (
    <li className="flex items-center justify-between gap-3 py-2 text-sm">
      <span className="min-w-0">
        <span className="block truncate font-medium">{item.booking_title}</span>
        <span className="block text-xs text-gray-500">
          {item.talent_name} · {format(new Date(date), "d MMM yyyy")}
        </span>
      </span>
      <span className="flex-shrink-0 font-semibold">{formatCurrency(item.amount_cents, item.currency)}</span>
    </li>
  );
}

/** Dashboard card for managers and road managers: their own share of their talents' bookings */
export function MyEarningsCard() {
  const [data, setData] = useState<Earnings | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    api<Earnings>("/api/earnings/mine")
      .then(setData)
      .catch(() => setFailed(true));
  }, []);

  if (failed) return null;

  return (
    <section className="rounded-lg border bg-white p-4">
      <h2 className="mb-3 text-lg font-semibold">Your earnings</h2>
      {!data ? (
        <Loader2 className="mx-auto h-6 w-6 animate-spin text-gold" />
      ) : data.owed.length + data.paid.length + data.upcoming.length === 0 ? (
        <p className="text-sm text-gray-500">Nothing yet. Your share of your talents&apos; bookings will show here.</p>
      ) : (
        <div className="space-y-4">
          <div>
            <p className="flex items-baseline justify-between gap-3">
              <span className="text-sm font-medium">To be paid</span>
              <span className="text-xl font-bold">{total(data.owed)}</span>
            </p>
            {data.owed.length > 0 && (
              <ul className="divide-y">
                {data.owed.map((item) => (
                  <EarningRow key={item.booking_id} item={item} date={item.starts_at} />
                ))}
              </ul>
            )}
          </div>
          {data.upcoming.length > 0 && (
            <p className="flex items-baseline justify-between gap-3 border-t pt-3 text-sm">
              <span className="text-gray-600">
                Coming up: {data.upcoming.length} booking{data.upcoming.length === 1 ? "" : "s"}
              </span>
              <span className="font-medium">{total(data.upcoming)}</span>
            </p>
          )}
          {data.paid.length > 0 && (
            <div className="border-t pt-3">
              <p className="text-sm font-medium">Paid recently</p>
              <ul className="divide-y">
                {data.paid.map((item) => (
                  <EarningRow key={item.booking_id} item={item} date={item.paid_at!} />
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
