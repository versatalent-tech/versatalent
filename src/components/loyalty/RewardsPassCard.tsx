"use client";

import { useCallback, useEffect, useState } from "react";
import { Gift, Loader2, Ticket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CLAIM_STATUSES, formatClaimCode, type MemberReward, type MemberRewards, type RewardClaim } from "@/lib/loyalty/types";

const when = (value: string) =>
  new Date(value).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/London" });
const day = (value: string) =>
  new Date(value).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "Europe/London" });

function ClaimForm({ reward, memberId, onDone }: { reward: MemberReward; memberId: string; onDone: (claim: RewardClaim) => void }) {
  const [eventId, setEventId] = useState(reward.events[0]?.id ?? "");
  const [guest, setGuest] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const claim = async () => {
    setSaving(true);
    setError(null);
    try {
      const response = await fetch("/api/rewards/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          member: memberId,
          reward_id: reward.id,
          event_id: reward.requires_event ? eventId : null,
          guest_name: reward.needs_guest_name ? guest : null,
        }),
      });
      const body = await response.json();
      if (!body.success) throw new Error(body.error);
      onDone(body.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't claim that reward");
      setSaving(false);
    }
  };

  return (
    <div className="mt-3 space-y-3 rounded-lg bg-gray-50 p-3">
      {reward.requires_event && (
        <label className="block text-sm">
          <span className="mb-1 block font-medium">Event</span>
          <select
            value={eventId}
            onChange={(e) => setEventId(e.target.value)}
            className="h-9 w-full rounded-md border bg-white px-2 text-sm"
          >
            {reward.events.map((e) => (
              <option key={e.id} value={e.id}>
                {e.title} · {day(e.start_time)}
              </option>
            ))}
          </select>
        </label>
      )}
      {reward.needs_guest_name && (
        <label className="block text-sm">
          <span className="mb-1 block font-medium">Your guest&apos;s full name</span>
          <Input value={guest} onChange={(e) => setGuest(e.target.value)} placeholder="As on their ID" />
          <span className="mt-1 block text-xs text-gray-500">Your guest must be 18+ and bring ID.</span>
        </label>
      )}
      {error && <p className="text-sm text-red-700">{error}</p>}
      <Button onClick={claim} disabled={saving} className="bg-gold text-black hover:bg-gold/90">
        {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Claim{reward.point_cost > 0 ? ` for ${reward.point_cost.toLocaleString("en-GB")} points` : ""}
      </Button>
    </div>
  );
}

/**
 * Rewards on the member's pass: spendable points, rewards to claim, and
 * claim codes to show at the bar or door.
 */
export function RewardsPassCard({ memberId }: { memberId: string }) {
  const [data, setData] = useState<MemberRewards | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [justClaimed, setJustClaimed] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    fetch(`/api/rewards?member=${encodeURIComponent(memberId)}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((body) => body.success && setData(body.data))
      .catch(() => undefined);
  }, [memberId]);
  useEffect(load, [load]);

  if (!data) return null;
  const openClaims = data.claims.filter((c) => c.status === "reserved");
  const pastClaims = data.claims.filter((c) => c.status !== "reserved").slice(0, 5);
  if (!data.rewards_open && data.claims.length === 0) return null;

  const cancel = async (claim: RewardClaim) => {
    if (!window.confirm(`Cancel your ${claim.reward_title}?${claim.points_held ? ` Your ${claim.points_held} points come back.` : ""}`)) return;
    setError(null);
    const response = await fetch(`/api/rewards/claims/${claim.id}/cancel`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ member: memberId }),
    });
    const body = await response.json().catch(() => ({}));
    if (!body.success) setError(body.error || "Couldn't cancel");
    load();
  };

  return (
    <div className="mb-6 rounded-2xl bg-white p-6 shadow-2xl sm:p-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-2xl font-bold">
            <Gift className="h-6 w-6 text-gold" /> Rewards
          </h2>
          <p className="text-sm text-gray-500">Spend your reward points. Your tier is based on status points and isn&apos;t affected.</p>
        </div>
        <div className="text-right">
          <p className="text-3xl font-bold tabular-nums text-gold">{data.reward_balance.toLocaleString("en-GB")}</p>
          <p className="text-xs uppercase tracking-wide text-gray-500">points to spend</p>
        </div>
      </div>

      {error && <p className="mb-4 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}

      {openClaims.length > 0 && (
        <div className="mb-6 space-y-3">
          <h3 className="font-semibold">Ready to use</h3>
          {openClaims.map((c) => (
            <div
              key={c.id}
              className={`rounded-xl border-2 p-4 ${c.id === justClaimed ? "border-gold bg-gold/10" : "border-gray-200"}`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="flex items-center gap-2 font-semibold">
                    <Ticket className="h-4 w-4 text-gold" /> {c.reward_title}
                  </p>
                  {c.event && (
                    <p className="text-sm text-gray-600">
                      {c.event.title} · {day(c.event.start_time)}
                    </p>
                  )}
                  {c.guest_name && <p className="text-sm text-gray-600">Guest: {c.guest_name}</p>}
                  <p className="text-xs text-gray-500">Use by {when(c.expires_at)}</p>
                </div>
                <div className="text-right">
                  <p className="font-mono text-2xl font-bold tracking-widest">{formatClaimCode(c.code)}</p>
                  <p className="text-xs text-gray-500">Show this code, or tap your card, at the {c.kind === "drink" ? "bar" : "door"}</p>
                </div>
              </div>
              <button type="button" onClick={() => cancel(c)} className="mt-2 text-xs text-gray-500 underline">
                Cancel
              </button>
            </div>
          ))}
        </div>
      )}

      {data.rewards_open && (
        <ul className="space-y-3">
          {data.rewards.map((r) => (
            <li key={r.id} className="rounded-lg border p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold">
                    {r.title}
                    {r.founding_only && <span className="ml-2 rounded bg-black px-2 py-0.5 text-xs font-normal text-gold">V•PRIVILEGE</span>}
                  </p>
                  {r.description && <p className="text-sm text-gray-600">{r.description}</p>}
                </div>
                <div className="text-right">
                  <p className="font-semibold tabular-nums">{r.point_cost > 0 ? `${r.point_cost.toLocaleString("en-GB")} pts` : "Included"}</p>
                  {r.blocked_reason ? (
                    <p className="text-xs text-gray-500">{r.blocked_reason}</p>
                  ) : (
                    open !== r.id && (
                      <Button size="sm" variant="outline" className="mt-1" onClick={() => setOpen(r.id)}>
                        Claim
                      </Button>
                    )
                  )}
                </div>
              </div>
              {open === r.id && !r.blocked_reason && (
                <ClaimForm
                  reward={r}
                  memberId={memberId}
                  onDone={(claim) => {
                    setOpen(null);
                    setJustClaimed(claim.id);
                    load();
                  }}
                />
              )}
            </li>
          ))}
          {data.rewards.length === 0 && <li className="text-sm text-gray-500">No rewards available right now.</li>}
        </ul>
      )}

      {pastClaims.length > 0 && (
        <div className="mt-6 border-t pt-4">
          <h3 className="mb-2 text-sm font-semibold text-gray-600">Recent</h3>
          <ul className="space-y-1 text-sm text-gray-600">
            {pastClaims.map((c) => (
              <li key={c.id} className="flex justify-between gap-3">
                <span className="truncate">{c.reward_title}</span>
                <span className="whitespace-nowrap text-gray-500">
                  {CLAIM_STATUSES[c.status]}
                  {c.redeemed_at ? ` ${day(c.redeemed_at)}` : ""}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
