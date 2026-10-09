"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, Crown, Gift, Loader2, Nfc, Search, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useBridgeCardTaps } from "@/lib/hooks/useBridgeCardTaps";
import { formatClaimCode, type MemberReward, type StaffRewardLookup } from "@/lib/loyalty/types";

type Lookup = StaffRewardLookup & { note?: string | null };

const day = (value: string) =>
  new Date(value).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "Europe/London" });

async function call<T>(url: string, init?: RequestInit & { json?: unknown }): Promise<{ data: T; message?: string }> {
  const response = await fetch(url, {
    ...init,
    credentials: "include",
    headers: init?.json ? { "Content-Type": "application/json" } : undefined,
    body: init?.json ? JSON.stringify(init.json) : undefined,
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok || !body.success) throw new Error(body.error || "Something went wrong");
  return { data: body.data, message: body.message };
}

function GiveForm({ reward, userId, onDone, onError }: { reward: MemberReward; userId: string; onDone: (l: Lookup, msg: string) => void; onError: (m: string) => void }) {
  const [eventId, setEventId] = useState(reward.events[0]?.id ?? "");
  const [guest, setGuest] = useState("");
  const [saving, setSaving] = useState(false);

  const give = async () => {
    setSaving(true);
    try {
      const { data, message } = await call<{ lookup: Lookup }>("/api/staff/rewards", {
        method: "POST",
        json: { action: "give", user_id: userId, reward_id: reward.id, event_id: reward.requires_event ? eventId : null, guest_name: guest || null },
      });
      onDone(data.lookup, message ?? "Given");
    } catch (err) {
      onError(err instanceof Error ? err.message : "Couldn't give that reward");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mt-3 space-y-2">
      {reward.requires_event && (
        <select value={eventId} onChange={(e) => setEventId(e.target.value)} className="h-10 w-full rounded-md border border-gray-600 bg-gray-900 px-2">
          {reward.events.map((e) => (
            <option key={e.id} value={e.id}>
              {e.title} · {day(e.start_time)}
            </option>
          ))}
        </select>
      )}
      {reward.needs_guest_name && (
        <Input value={guest} onChange={(e) => setGuest(e.target.value)} placeholder="Guest's full name" className="border-gray-600 bg-gray-900" />
      )}
      <Button onClick={give} disabled={saving} className="w-full bg-gold py-6 text-lg text-black hover:bg-gold/90">
        {saving && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
        Give now{reward.point_cost > 0 ? ` (−${reward.point_cost} pts)` : ""}
      </Button>
    </div>
  );
}

/**
 * Staff rewards: tap the member's card or type their claim code, then mark
 * a claim used, or give a reward on the spot. A used code is refused.
 */
export default function StaffRewardsPage() {
  const [code, setCode] = useState("");
  const [lookup, setLookup] = useState<Lookup | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [giving, setGiving] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const find = useCallback(async (query: { code?: string; card_uid?: string }) => {
    setLoading(true);
    setMessage(null);
    setGiving(null);
    try {
      const params = new URLSearchParams(query as Record<string, string>);
      const { data } = await call<Lookup>(`/api/staff/rewards?${params}`);
      setLookup(data);
      if (data.note) setMessage({ ok: false, text: data.note });
    } catch (err) {
      setLookup(null);
      setMessage({ ok: false, text: err instanceof Error ? err.message : "Not found" });
    } finally {
      setLoading(false);
    }
  }, []);

  const { state } = useBridgeCardTaps((uid) => find({ card_uid: uid }));

  const redeem = async (claimId: string, title: string) => {
    setBusy(claimId);
    setMessage(null);
    try {
      const { data } = await call<{ lookup: Lookup }>("/api/staff/rewards", { method: "POST", json: { action: "redeem", claim_id: claimId } });
      setLookup(data.lookup);
      setMessage({ ok: true, text: `${title}: used. Hand it over.` });
    } catch (err) {
      setMessage({ ok: false, text: err instanceof Error ? err.message : "Couldn't mark it used" });
    } finally {
      setBusy(null);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black text-white">
      <div className="mx-auto max-w-3xl space-y-6 px-4 py-8">
        <div className="flex items-center justify-between gap-3">
          <Link href="/staff/event-day" className="flex items-center gap-1 text-sm text-gray-400 hover:text-gold">
            <ArrowLeft className="h-4 w-4" /> Event day
          </Link>
          <span className="flex items-center gap-1 text-xs text-gray-400">
            <Nfc className="h-4 w-4" /> {state === "ready" ? "Card reader ready" : state === "no-reader" ? "No card reader" : "Card reader offline"}
          </span>
        </div>
        <h1 className="flex items-center gap-2 text-3xl font-bold">
          <Gift className="h-8 w-8 text-gold" /> Rewards
        </h1>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (code.trim()) find({ code });
          }}
          className="flex gap-2"
        >
          <Input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="Claim code, e.g. ABCD-2345, or tap the card"
            className="h-14 border-gray-600 bg-gray-900 font-mono text-xl tracking-widest"
            autoCapitalize="characters"
          />
          <Button type="submit" disabled={loading} className="h-14 bg-gold px-6 text-black hover:bg-gold/90">
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Search className="h-5 w-5" />}
          </Button>
        </form>

        {message && (
          <div className={`flex items-start gap-3 rounded-xl p-4 text-lg ${message.ok ? "bg-green-900/60" : "bg-red-900/60"}`}>
            {message.ok ? <CheckCircle2 className="mt-0.5 h-6 w-6 flex-shrink-0 text-green-400" /> : <XCircle className="mt-0.5 h-6 w-6 flex-shrink-0 text-red-300" />}
            {message.text}
          </div>
        )}

        {lookup && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-white/5 p-4">
              <div>
                <p className="text-2xl font-bold">{lookup.member.name}</p>
                <p className="flex items-center gap-2 text-sm capitalize text-gray-300">
                  <Crown className="h-4 w-4 text-gold" /> {lookup.member.tier}
                  {lookup.member.founding && <span className="rounded bg-gold/20 px-2 py-0.5 text-xs normal-case text-gold">V•PRIVILEGE</span>}
                </p>
              </div>
              <p className="text-right">
                <span className="block text-3xl font-bold tabular-nums text-gold">{lookup.member.reward_balance.toLocaleString("en-GB")}</span>
                <span className="text-xs uppercase text-gray-400">points to spend</span>
              </p>
            </div>

            <section className="space-y-3">
              <h2 className="text-lg font-semibold">Ready to use</h2>
              {lookup.claims.length === 0 && <p className="text-gray-400">Nothing claimed.</p>}
              {lookup.claims.map((c) => (
                <div key={c.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gold/40 p-4">
                  <div>
                    <p className="text-xl font-semibold">{c.reward_title}</p>
                    <p className="font-mono text-sm text-gray-400">{formatClaimCode(c.code)}</p>
                    {c.event && <p className="text-sm text-gray-300">{c.event.title} · {day(c.event.start_time)}</p>}
                    {c.guest_name && <p className="text-sm text-gray-300">Guest: {c.guest_name} (check ID, 18+)</p>}
                  </div>
                  <Button onClick={() => redeem(c.id, c.reward_title)} disabled={busy === c.id} className="bg-gold px-8 py-6 text-lg text-black hover:bg-gold/90">
                    {busy === c.id && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
                    Mark used
                  </Button>
                </div>
              ))}
            </section>

            {lookup.rewards_open && (
              <section className="space-y-3">
                <h2 className="text-lg font-semibold">Give a reward now</h2>
                {lookup.rewards.map((r) => (
                  <div key={r.id} className="rounded-xl bg-white/5 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-semibold">{r.title}</p>
                        <p className="text-sm text-gray-400">
                          {r.point_cost > 0 ? `${r.point_cost} pts` : "Included"}
                          {r.blocked_reason ? ` · ${r.blocked_reason}` : ""}
                        </p>
                      </div>
                      {!r.blocked_reason && giving !== r.id && (
                        <Button variant="outline" className="border-gold text-gold hover:bg-gold/10" onClick={() => setGiving(r.id)}>
                          Give
                        </Button>
                      )}
                    </div>
                    {giving === r.id && (
                      <GiveForm
                        reward={r}
                        userId={lookup.member.id}
                        onDone={(l, msg) => {
                          setLookup(l);
                          setGiving(null);
                          setMessage({ ok: true, text: `${msg}. Hand it over.` });
                        }}
                        onError={(m) => setMessage({ ok: false, text: m })}
                      />
                    )}
                  </div>
                ))}
              </section>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
