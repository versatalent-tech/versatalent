"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { Gift, Loader2, Lock, Sparkles, Star } from "lucide-react";
import { TIER_LABELS, type RewardsSummary } from "@/lib/portal/types";
import { api, errorMessage } from "@/components/crm/shared";

const TIER_STYLES = { silver: "from-gray-300 to-gray-500", gold: "from-yellow-300 to-amber-600", black: "from-gray-800 to-black" } as const;

export default function PortalRewardsPage() {
  const [data, setData] = useState<RewardsSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<RewardsSummary>("/api/portal/rewards").then(setData).catch((err) => setError(errorMessage(err)));
  }, []);

  if (error) return <p className="rounded border border-red-200 bg-red-50 p-4 text-red-800">{error}</p>;
  if (!data) return <Loader2 className="mx-auto mt-16 h-8 w-8 animate-spin text-gold" />;

  const m = data.membership;
  const progress = m && m.points_to_next != null && m.next_tier ? Math.min(100, Math.round((m.status_points / (m.status_points + m.points_to_next)) * 100)) : 100;
  const unlocked = data.perks.filter((p) => p.unlocked);
  const locked = data.perks.filter((p) => !p.unlocked);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Rewards</h1>

      {m ? (
        <section className={`rounded-xl bg-gradient-to-br ${TIER_STYLES[m.tier]} p-5 text-white shadow`}>
          <p className="text-sm uppercase tracking-wide opacity-80">{TIER_LABELS[m.tier]} member</p>
          <p className="text-4xl font-bold">{m.points_balance} points</p>
          <p className="text-sm opacity-80">{m.lifetime_points} earned in total</p>
          {m.next_tier && m.points_to_next != null && (
            <div className="mt-4 space-y-1">
              <div className="h-2 overflow-hidden rounded-full bg-white/30">
                <div className="h-full rounded-full bg-white" style={{ width: `${progress}%` }} />
              </div>
              <p className="text-sm">
                {m.points_to_next} more this year to reach {TIER_LABELS[m.next_tier]} (year ends {format(new Date(`${m.year_ends}T00:00:00`), "d MMM yyyy")})
              </p>
            </div>
          )}
          {m.discount_percent > 0 && <p className="mt-2 text-sm">{m.discount_percent}% off at our events&apos; bar</p>}
        </section>
      ) : (
        <section className="rounded-xl border bg-white p-5">
          <p className="font-medium">You&apos;re not collecting points yet</p>
          <p className="text-sm text-gray-500">Ask the team for your VersaTalent card, then tap it at our events to earn points.</p>
        </section>
      )}

      <section className="space-y-3">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <Gift className="h-5 w-5 text-gold" /> Your artist perks
        </h2>
        {unlocked.length === 0 ? (
          <p className="rounded-xl border bg-white p-5 text-sm text-gray-500">No perks yet. Check back soon.</p>
        ) : (
          <ul className="space-y-2">
            {unlocked.map((perk) => (
              <li key={perk.id} className="rounded-xl border bg-white p-4">
                <p className="flex items-center gap-2 font-medium">
                  {perk.just_for_you ? <Sparkles className="h-4 w-4 text-gold" /> : <Star className="h-4 w-4 text-gold" />}
                  {perk.title}
                  {perk.just_for_you && <span className="rounded bg-amber-100 px-1.5 py-0.5 text-xs text-amber-900">Just for you</span>}
                </p>
                {perk.description && <p className="mt-1 text-sm text-gray-600">{perk.description}</p>}
                {perk.valid_until && <p className="mt-1 text-xs text-gray-400">Until {format(new Date(`${perk.valid_until}T00:00:00`), "d MMM yyyy")}</p>}
              </li>
            ))}
          </ul>
        )}
        {locked.length > 0 && (
          <ul className="space-y-2">
            {locked.map((perk) => (
              <li key={perk.id} className="flex items-start gap-3 rounded-xl border border-dashed bg-white/60 p-4 text-gray-500">
                <Lock className="mt-0.5 h-4 w-4 flex-shrink-0" />
                <div>
                  <p className="font-medium">{perk.title}</p>
                  <p className="text-sm">Unlocks at {TIER_LABELS[perk.min_tier!]}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {data.tier_benefits.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-lg font-semibold">{m ? TIER_LABELS[m.tier] : ""} member benefits</h2>
          <ul className="space-y-1 rounded-xl border bg-white p-4 text-sm">
            {data.tier_benefits.map((b) => (
              <li key={b.title}>
                <span className="font-medium">{b.title}</span>
                {b.description ? ` · ${b.description}` : ""}
              </li>
            ))}
          </ul>
        </section>
      )}

      {data.history.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-lg font-semibold">Points history</h2>
          <ul className="divide-y rounded-xl border bg-white">
            {data.history.map((entry) => (
              <li key={entry.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                <div>
                  <p>{entry.label}</p>
                  <p className="text-xs text-gray-400">{format(new Date(entry.created_at), "d MMM yyyy")}</p>
                </div>
                <span className={`font-semibold ${entry.delta_points >= 0 ? "text-green-700" : "text-red-700"}`}>
                  {entry.delta_points >= 0 ? "+" : ""}
                  {entry.delta_points}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
