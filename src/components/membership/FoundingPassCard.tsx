"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronDown, Loader2, Lock, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatMoney, type MemberFoundingStatus, type SoldBenefit } from "@/lib/membership/founding";

const longDate = (value: string) =>
  new Date(value).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/London" });

function BenefitList({ benefits }: { benefits: SoldBenefit[] }) {
  return (
    <ul className="space-y-3">
      {benefits.map((b) => (
        <li key={b.title} className="flex gap-2">
          <Star className="mt-1 h-4 w-4 flex-shrink-0 text-gold" />
          <span>
            <span className="font-medium">{b.title}</span>
            {b.description && <span className="block text-sm text-gray-300">{b.description}</span>}
            {(b.limit_text || b.eligibility_text) && (
              <span className="block text-xs text-gray-400">{[b.limit_text, b.eligibility_text].filter(Boolean).join(" · ")}</span>
            )}
          </span>
        </li>
      ))}
    </ul>
  );
}

/**
 * V•PRIVILEGE on the member's pass: their Founding Membership (number,
 * dates, the benefits they bought) or, when on sale, the offer.
 */
export function FoundingPassCard({ memberId }: { memberId: string }) {
  const [status, setStatus] = useState<MemberFoundingStatus | null>(null);
  const [showOffer, setShowOffer] = useState(false);
  const [accept, setAccept] = useState(false);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/membership/founding?member=${encodeURIComponent(memberId)}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((body) => body.success && setStatus(body.data))
      .catch(() => undefined);
  }, [memberId]);

  if (!status) return null;
  const { current, upcoming } = status;
  // Nothing to show: not a member, not on sale, nothing lapsed
  if (!current && !status.can_buy && !status.lapsed_on && !upcoming) return null;

  const buy = async () => {
    if (!accept) {
      setError("Please accept the Founding Membership terms to continue.");
      return;
    }
    setPaying(true);
    setError(null);
    try {
      const response = await fetch("/api/membership/founding/buy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ member: memberId, accept_terms: true }),
      });
      const body = await response.json();
      if (!body.success) throw new Error(body.error);
      window.location.href = body.data.paymentUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Payment couldn't start");
      setPaying(false);
    }
  };

  const number = status.founding_number ? `No. ${String(status.founding_number).padStart(3, "0")}` : null;
  const renewing = Boolean(current || status.lapsed_on);

  return (
    <div className="mb-6 overflow-hidden rounded-2xl border border-gold/40 bg-gradient-to-br from-black via-gray-900 to-black p-8 text-white shadow-2xl">
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-sm uppercase tracking-widest text-gold">V•PRIVILEGE Founding</p>
        {number && <p className="font-mono text-sm text-gray-300">{number}</p>}
      </div>

      {current && !upcoming && status.can_buy && (
        <p className="mb-4 rounded-lg border border-gold bg-gold/15 px-4 py-3 text-sm text-gold">
          Your membership ends in {Math.max(1, Math.ceil((new Date(current.ends_at).getTime() - Date.now()) / 86400000))} day
          {Math.ceil((new Date(current.ends_at).getTime() - Date.now()) / 86400000) === 1 ? "" : "s"}. It won&apos;t renew
          automatically: renew below to keep your benefits and your number.
        </p>
      )}
      {current ? (
        <>
          <p className="text-2xl font-bold">Member until {longDate(current.ends_at)}</p>
          <p className="mb-6 text-sm text-gray-400">
            {upcoming ? `Renewed: your next year runs to ${longDate(upcoming.ends_at)}.` : "One-off payment; it won't renew automatically."}
          </p>
          <BenefitList benefits={current.benefits} />
        </>
      ) : upcoming ? (
        <p className="text-2xl font-bold">Starts {longDate(upcoming.starts_at)}</p>
      ) : status.lapsed_on ? (
        <>
          <p className="text-2xl font-bold">Ended on {longDate(status.lapsed_on)}</p>
          <p className="text-sm text-gray-400">Your tier and points are unaffected.</p>
        </>
      ) : (
        <>
          <p className="text-2xl font-bold">Become a Founding Member</p>
          <p className="text-sm text-gray-300">
            {formatMoney(status.price_cents)} for 12 months, paid once. Separate from your tier: it never changes your points or
            discount.
          </p>
        </>
      )}

      {status.can_buy && (
        <div className="mt-6 border-t border-white/10 pt-6">
          {!current && (
            <button
              type="button"
              onClick={() => setShowOffer((v) => !v)}
              className="mb-4 flex items-center gap-1 text-sm text-gold"
              aria-expanded={showOffer}
            >
              What&apos;s included <ChevronDown className={`h-4 w-4 transition-transform ${showOffer ? "rotate-180" : ""}`} />
            </button>
          )}
          {showOffer && !current && (
            <div className="mb-6">
              <BenefitList benefits={status.benefits_on_offer} />
            </div>
          )}
          <label className="mb-4 flex items-start gap-3 text-sm text-gray-300">
            <input type="checkbox" checked={accept} onChange={(e) => setAccept(e.target.checked)} className="mt-0.5 h-4 w-4 accent-[#D4AF37]" />
            <span>
              I accept the{" "}
              <Link href="/membership/terms#founding" target="_blank" className="text-gold underline">
                Founding Membership terms
              </Link>
              .
            </span>
          </label>
          {error && <p className="mb-3 text-sm text-red-300">{error}</p>}
          <Button onClick={buy} disabled={paying} className="bg-gold text-black hover:bg-gold/90">
            {paying && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {renewing ? "Renew" : "Join"} for {formatMoney(status.price_cents)}
          </Button>
          <p className="mt-2 flex items-center gap-1.5 text-xs text-gray-400">
            <Lock className="h-3.5 w-3.5" /> You&apos;ll pay on SumUp&apos;s secure page. We never see your card details.
          </p>
        </div>
      )}
      {!status.can_buy && !current && status.cannot_buy_reason && status.lapsed_on && (
        <p className="mt-4 text-sm text-gray-400">{status.cannot_buy_reason}</p>
      )}
    </div>
  );
}
