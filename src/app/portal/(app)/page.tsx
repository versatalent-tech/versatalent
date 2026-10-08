"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Gift, Loader2 } from "lucide-react";
import { TIER_LABELS, type PortalHome } from "@/lib/portal/types";
import { api, errorMessage } from "@/components/crm/shared";
import { TalentBookingCard } from "@/components/portal/TalentBookingCard";

export default function PortalHomePage() {
  const [home, setHome] = useState<PortalHome | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    api<PortalHome>("/api/portal/home").then(setHome).catch((err) => setError(errorMessage(err)));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (error) return <p className="rounded border border-red-200 bg-red-50 p-4 text-red-800">{error}</p>;
  if (!home) return <Loader2 className="mx-auto mt-16 h-8 w-8 animate-spin text-gold" />;

  const firstName = home.name.split(" ")[0];
  const upcoming = home.next_bookings.filter((b) => !home.awaiting_response.some((a) => a.id === b.id));

  return (
    <div className="space-y-8">
      <section className="flex items-center gap-4">
        {home.image_src && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={home.image_src} alt="" className="h-16 w-16 rounded-full object-cover" />
        )}
        <div>
          <h1 className="text-2xl font-bold">Hi {firstName}</h1>
          <p className="text-gray-500">{home.talent_name}{home.profession ? ` · ${home.profession}` : ""}</p>
        </div>
      </section>

      {home.awaiting_response.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Waiting for your answer</h2>
          {home.awaiting_response.map((b) => (
            <TalentBookingCard key={b.id} booking={b} onChanged={load} />
          ))}
        </section>
      )}

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Coming up</h2>
          <Link href="/portal/bookings" className="flex items-center gap-1 text-sm text-gray-500 hover:text-gold">
            All bookings <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        {upcoming.length === 0 ? (
          <p className="rounded-xl border bg-white p-6 text-center text-sm text-gray-500">
            {home.awaiting_response.length > 0 ? "Nothing else coming up yet." : "No bookings coming up yet."}
          </p>
        ) : (
          upcoming.map((b) => <TalentBookingCard key={b.id} booking={b} detailed={false} onChanged={load} />)
        )}
      </section>

      <Link href="/portal/rewards" className="flex items-center justify-between gap-4 rounded-xl bg-black p-5 text-white">
        <div>
          <p className="text-sm text-gray-400">Your rewards</p>
          <p className="text-2xl font-bold">
            {home.points_balance ?? 0} <span className="text-base font-normal text-gray-300">points</span>
          </p>
          <p className="text-sm text-gray-300">
            {home.tier ? `${TIER_LABELS[home.tier]} tier · ` : ""}
            {home.unlocked_perks} artist perk{home.unlocked_perks === 1 ? "" : "s"}
          </p>
        </div>
        <Gift className="h-10 w-10 text-gold" />
      </Link>
    </div>
  );
}
