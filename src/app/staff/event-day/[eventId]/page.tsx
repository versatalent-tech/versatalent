"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Crown,
  Keyboard,
  Loader2,
  Maximize,
  Minimize,
  Nfc,
  Star,
  Users,
  XCircle,
} from "lucide-react";
import { useBridgeCardTaps } from "@/lib/hooks/useBridgeCardTaps";
import type { EventDayCheckin, EventDayEvent } from "@/lib/db/repositories/event-day";

// How long a check-in result stays on screen before returning to "Tap your card"
const RESULT_DISPLAY_MS = 6000;
// Ignore the same card tapped again within this window (double reads)
const REPEAT_TAP_MS = 4000;
// Refresh counters so several door devices stay in step
const REFRESH_MS = 15000;

interface CheckinResult {
  status: "checked_in" | "already_checked_in" | "error";
  customer?: { id: string; name: string; role: string; avatar_url: string | null };
  checked_in_at?: string;
  points?: { awarded: number; already_awarded?: boolean; balance: number; tier: string } | null;
  points_error?: boolean;
  error?: string;
}

const TIER_STYLES: Record<string, string> = {
  black: "bg-black text-white border border-gray-600",
  gold: "bg-gold text-black",
  silver: "bg-gray-300 text-gray-900",
};

function formatTime(value: string) {
  return new Date(value).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/London" });
}

/** Short confirmation tone so door staff hear the result without looking */
function beep(ok: boolean) {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = ok ? 880 : 220;
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + (ok ? 0.25 : 0.5));
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + (ok ? 0.25 : 0.5));
    osc.onended = () => ctx.close();
  } catch {
    // Audio is a nicety; ignore if the browser blocks it
  }
}

export default function EventDayCheckinPage() {
  const { eventId } = useParams<{ eventId: string }>();

  const [event, setEvent] = useState<EventDayEvent | null>(null);
  const [checkins, setCheckins] = useState<EventDayCheckin[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<CheckinResult | null>(null);
  const [manualOpen, setManualOpen] = useState(false);
  const [manualUid, setManualUid] = useState("");
  const [fullscreen, setFullscreen] = useState(false);

  const resultTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTap = useRef<{ uid: string; at: number } | null>(null);
  // State updates are async, so guard against two taps landing in the same tick
  const busy = useRef(false);

  const load = useCallback(async () => {
    try {
      const response = await fetch(`/api/staff/event-day/${eventId}`, { credentials: "include" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to load event");
      setEvent(data.event);
      setCheckins(data.checkins);
      setLoadError(null);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Failed to load event");
    }
  }, [eventId]);

  useEffect(() => {
    load();
    const timer = setInterval(load, REFRESH_MS);
    return () => clearInterval(timer);
  }, [load]);

  useEffect(() => {
    const onChange = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  useEffect(() => () => {
    if (resultTimer.current) clearTimeout(resultTimer.current);
  }, []);

  const showResult = (next: CheckinResult) => {
    setResult(next);
    beep(next.status !== "error");
    if (resultTimer.current) clearTimeout(resultTimer.current);
    resultTimer.current = setTimeout(() => setResult(null), RESULT_DISPLAY_MS);
  };

  const checkIn = async (rawUid: string) => {
    const uid = rawUid.trim().toUpperCase();
    if (!uid || busy.current) return;

    const now = Date.now();
    if (lastTap.current && lastTap.current.uid === uid && now - lastTap.current.at < REPEAT_TAP_MS) return;
    lastTap.current = { uid, at: now };

    busy.current = true;
    setProcessing(true);
    try {
      const response = await fetch(`/api/staff/event-day/${eventId}/checkin`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ card_uid: uid }),
      });
      const data = await response.json();
      if (!response.ok) {
        showResult({ status: "error", error: data.error || "Check-in failed" });
      } else {
        showResult(data);
        load();
      }
    } catch {
      showResult({ status: "error", error: "Connection problem — please tap again" });
    } finally {
      busy.current = false;
      setProcessing(false);
    }
  };

  const tapsEnabled = !!event?.checkins_enabled;
  const { state: readerState, readerName } = useBridgeCardTaps(checkIn, { paused: processing || !tapsEnabled });

  const toggleFullscreen = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      document.documentElement.requestFullscreen?.().catch(() => {});
    }
  };

  const submitManual = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualUid.trim()) return;
    // Manual entry is deliberate, so skip the repeat-tap filter
    lastTap.current = null;
    checkIn(manualUid);
    setManualUid("");
  };

  const reader = (() => {
    switch (readerState) {
      case "ready":
        return { dot: "bg-green-500", text: readerName ? `Reader ready · ${readerName}` : "Reader ready" };
      case "no-reader":
        return { dot: "bg-amber-500", text: "NFC Bridge running — plug in the card reader" };
      case "unavailable":
        return { dot: "bg-red-500", text: "Card reader not connected — start the NFC Bridge app" };
      default:
        return { dot: "bg-gray-400", text: "Connecting to card reader…" };
    }
  })();

  if (!event) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-black p-4 text-white">
        {loadError ? (
          <div className="max-w-md text-center">
            <XCircle className="mx-auto mb-4 h-12 w-12 text-red-400" />
            <p className="mb-6 text-lg">{loadError}</p>
            <Link href="/staff/event-day" className="text-gold underline">Choose another event</Link>
          </div>
        ) : (
          <Loader2 className="h-10 w-10 animate-spin text-gold" />
        )}
      </main>
    );
  }

  const tone =
    result?.status === "checked_in"
      ? "from-green-900/80 via-green-950 to-black"
      : result?.status === "already_checked_in"
        ? "from-amber-900/70 via-amber-950 to-black"
        : result?.status === "error"
          ? "from-red-900/80 via-red-950 to-black"
          : "from-black via-gray-900 to-black";

  return (
    <main className={`min-h-screen bg-gradient-to-br ${tone} text-white transition-colors duration-500`}>
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col px-4 py-4 lg:px-8">
        {/* Header */}
        <header className="flex items-center gap-3">
          <Link href="/staff/event-day" className="rounded-lg p-2 text-gray-400 hover:bg-white/10 hover:text-white" aria-label="Back to events">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-xl font-bold lg:text-2xl">{event.title}</h1>
            <p className="truncate text-sm text-gray-400">
              {new Date(event.start_time).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", timeZone: "Europe/London" })}
              {event.venue?.name ? ` · ${event.venue.name}` : ""}
            </p>
          </div>
          <div className="hidden items-center gap-2 text-xs text-gray-300 sm:flex" role="status">
            <span className={`h-2.5 w-2.5 rounded-full ${reader.dot}`} />
            {reader.text}
          </div>
          <button onClick={toggleFullscreen} className="rounded-lg p-2 text-gray-400 hover:bg-white/10 hover:text-white" aria-label={fullscreen ? "Exit full screen" : "Full screen"}>
            {fullscreen ? <Minimize className="h-5 w-5" /> : <Maximize className="h-5 w-5" />}
          </button>
        </header>

        <div className="mt-2 flex items-center gap-2 text-xs text-gray-300 sm:hidden" role="status">
          <span className={`h-2.5 w-2.5 rounded-full ${reader.dot}`} />
          {reader.text}
        </div>

        {!event.checkins_enabled && (
          <div className="mt-4 flex items-start gap-2 rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-200">
            <XCircle className="mt-0.5 h-4 w-4 shrink-0" />
            Check-ins are disabled for this event. An admin can enable them from Admin → Events.
          </div>
        )}
        {event.checkins_enabled && !event.is_today && (
          <div className="mt-4 flex items-start gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-200">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            This event isn&apos;t scheduled for today, so check-ins earn the once-a-day check-in points rather than event points.
          </div>
        )}

        <div className="mt-6 grid flex-1 gap-6 lg:grid-cols-[1fr_340px]">
          {/* Tap / result panel */}
          <section className="flex min-h-[420px] flex-col items-center justify-center rounded-3xl border border-white/10 bg-white/5 p-8 text-center" aria-live="assertive">
            {processing ? (
              <>
                <Loader2 className="mb-6 h-20 w-20 animate-spin text-gold" />
                <p className="text-3xl font-semibold">Checking you in…</p>
              </>
            ) : result ? (
              <ResultView result={result} />
            ) : (
              <>
                <div className="relative mb-8">
                  <span className="absolute inset-0 animate-ping rounded-full bg-gold/20" />
                  <div className="relative flex h-40 w-40 items-center justify-center rounded-full border-4 border-gold/60 bg-gold/10">
                    <Nfc className="h-20 w-20 text-gold" />
                  </div>
                </div>
                <p className="text-4xl font-bold lg:text-5xl">Tap your card</p>
                <p className="mt-3 text-lg text-gray-400">Hold your VersaTalent card on the reader to check in and collect your points</p>
              </>
            )}
          </section>

          {/* Stats + recent check-ins */}
          <aside className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-3">
              <Stat icon={<Users className="h-4 w-4" />} label="Checked in" value={event.unique_attendees} />
              <Stat icon={<Star className="h-4 w-4" />} label="Rewarded" value={event.members_rewarded} hint="members" />
            </div>

            <div className="flex min-h-0 flex-1 flex-col rounded-2xl border border-white/10 bg-white/5">
              <h2 className="border-b border-white/10 px-4 py-3 text-sm font-semibold uppercase tracking-wider text-gray-400">Latest arrivals</h2>
              {checkins.length === 0 ? (
                <p className="px-4 py-6 text-sm text-gray-500">No one has checked in yet.</p>
              ) : (
                <ul className="max-h-[420px] divide-y divide-white/5 overflow-y-auto">
                  {checkins.map((c) => (
                    <li key={c.id} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                      <span className="w-12 shrink-0 tabular-nums text-gray-500">{formatTime(c.timestamp)}</span>
                      <span className="min-w-0 flex-1 truncate">{c.user_name || "Unknown member"}</span>
                      {c.points_awarded > 0 && <span className="shrink-0 font-semibold text-gold">+{c.points_awarded}</span>}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Manual entry for when a card won't read */}
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              {manualOpen ? (
                <form onSubmit={submitManual} className="flex gap-2">
                  <input
                    autoFocus
                    value={manualUid}
                    onChange={(e) => setManualUid(e.target.value)}
                    placeholder="Card ID (e.g. 04A1B2C3)"
                    className="min-w-0 flex-1 rounded-lg border border-white/20 bg-black/40 px-3 py-2 font-mono text-sm uppercase placeholder:normal-case placeholder:text-gray-500 focus:border-gold focus:outline-none"
                    disabled={!tapsEnabled || processing}
                  />
                  <button
                    type="submit"
                    disabled={!tapsEnabled || processing || !manualUid.trim()}
                    className="rounded-lg bg-gold px-4 py-2 text-sm font-semibold text-black disabled:opacity-40"
                  >
                    Check in
                  </button>
                </form>
              ) : (
                <button onClick={() => setManualOpen(true)} className="flex w-full items-center justify-center gap-2 text-sm text-gray-400 hover:text-white">
                  <Keyboard className="h-4 w-4" /> Card won&apos;t read? Enter card ID
                </button>
              )}
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}

function Stat({ icon, label, value, hint }: { icon: React.ReactNode; label: string; value: number; hint?: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="flex items-center gap-1.5 text-xs uppercase tracking-wider text-gray-400">{icon}{label}</div>
      <div className="mt-1 text-3xl font-bold tabular-nums">
        {value}
        {hint && <span className="ml-1 text-sm font-normal text-gray-500">{hint}</span>}
      </div>
    </div>
  );
}

function ResultView({ result }: { result: CheckinResult }) {
  if (result.status === "error") {
    return (
      <>
        <XCircle className="mb-6 h-24 w-24 text-red-400" />
        <p className="text-3xl font-bold lg:text-4xl">{result.error}</p>
        <p className="mt-3 text-lg text-gray-300">Please see a member of staff</p>
      </>
    );
  }

  const firstName = result.customer?.name?.split(" ")[0] || "there";
  const points = result.points;
  const isNew = result.status === "checked_in";

  return (
    <>
      {isNew ? (
        <CheckCircle2 className="mb-6 h-24 w-24 text-green-400" />
      ) : (
        <AlertTriangle className="mb-6 h-24 w-24 text-amber-400" />
      )}
      <p className="text-4xl font-bold lg:text-5xl">{isNew ? `Welcome, ${firstName}!` : `Welcome back, ${firstName}`}</p>
      <p className="mt-3 text-lg text-gray-300">
        {isNew
          ? "You're checked in. Enjoy the event!"
          : `You already checked in at ${result.checked_in_at ? formatTime(result.checked_in_at) : "an earlier time"}.`}
      </p>

      {points && (
        <div className="mt-8 flex flex-col items-center gap-3">
          {points.awarded > 0 ? (
            <div className="text-6xl font-extrabold text-gold">+{points.awarded} <span className="text-3xl">points</span></div>
          ) : (
            <div className="text-lg text-gray-300">Points for this event have already been collected</div>
          )}
          <div className="flex items-center gap-3 text-lg">
            <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm font-semibold capitalize ${TIER_STYLES[points.tier] || TIER_STYLES.silver}`}>
              <Crown className="h-4 w-4" /> {points.tier}
            </span>
            <span className="text-gray-300">Balance: <span className="font-semibold text-white tabular-nums">{points.balance.toLocaleString("en-GB")}</span> pts</span>
          </div>
        </div>
      )}

      {result.points_error && (
        <p className="mt-6 text-sm text-amber-300">We couldn&apos;t add your points just now — tap again in a moment to retry.</p>
      )}
    </>
  );
}
