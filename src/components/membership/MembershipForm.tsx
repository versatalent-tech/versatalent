"use client";

import { useState } from "react";
import Link from "next/link";
import { AlertCircle, Loader2, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { INTERESTS, REFERRAL_SOURCES } from "@/lib/vip-profile";
import { HONEYPOT_FIELD } from "@/lib/crm/types";
import { MIN_AGE } from "@/lib/membership/types";

const selectClass =
  "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";

function Label({ children, htmlFor }: { children: React.ReactNode; htmlFor?: string }) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-medium">
      {children}
    </label>
  );
}

/** Latest date of birth that is 18 today, for the date picker's max */
function latestBirthDate(): string {
  const d = new Date();
  d.setFullYear(d.getFullYear() - MIN_AGE);
  return d.toISOString().slice(0, 10);
}

export interface FoundingOffer {
  priceCents: number;
  /** All numbered places taken */
  soldOut: boolean;
}

export function MembershipForm({
  feeCents,
  founding,
  initialPlan = "free",
  initialReferralCode = "",
  referralsOpen = false,
}: {
  feeCents: number;
  /** Set when the Founding Membership is on sale */
  founding?: FoundingOffer | null;
  initialPlan?: "free" | "founding";
  /** From a friend's share link (?ref=CODE) */
  initialReferralCode?: string;
  referralsOpen?: boolean;
}) {
  const foundingAvailable = Boolean(founding && !founding.soldOut);
  const [plan, setPlan] = useState<"free" | "founding">(foundingAvailable ? initialPlan : "free");
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    date_of_birth: "",
    address_line1: "",
    address_line2: "",
    city: "",
    postcode: "",
    referral_source: "",
    referral_code: initialReferralCode,
  });
  const [interests, setInterests] = useState<string[]>([]);
  const [consents, setConsents] = useState({ consent_email: false, consent_sms: false, consent_post: false });
  const [interested, setInterested] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [trap, setTrap] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const gbp = (cents: number) => new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(cents / 100);
  const fee = gbp(feeCents);
  const foundingPrice = founding ? gbp(founding.priceCents) : "";
  const joinsFounding = plan === "founding";
  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!acceptTerms) {
      setError("Please accept the membership terms to continue.");
      return;
    }
    setSubmitting(true);
    try {
      const response = await fetch("/api/membership/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          referral_source: form.referral_source || null,
          interests,
          ...consents,
          founding_interest: interested || joinsFounding,
          plan,
          accept_terms: true,
          [HONEYPOT_FIELD]: trap,
        }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok || !body.success) throw new Error(body.error || "Something went wrong. Please try again.");
      if (body.data.paymentUrl) {
        window.location.href = body.data.paymentUrl; // SumUp's secure payment page
      } else if (body.data.membershipId) {
        window.location.href = `/membership/welcome?f=${body.data.membershipId}`;
      } else if (body.data.requestId) {
        window.location.href = `/membership/welcome?r=${body.data.requestId}`;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-8" noValidate>
      {/* Spam trap: hidden from people */}
      <p hidden aria-hidden="true">
        <label>
          Leave empty <input value={trap} onChange={(e) => setTrap(e.target.value)} tabIndex={-1} autoComplete="off" />
        </label>
      </p>

      {founding && (
        <fieldset className="space-y-3">
          <legend className="mb-2 text-lg font-semibold">Choose your membership</legend>
          <div className="grid gap-3 sm:grid-cols-2">
            {(
              [
                {
                  key: "free",
                  title: "VIP membership",
                  price: "Free",
                  text: `${fee} card delivery. Points, tiers and member discounts.`,
                  disabled: false,
                },
                {
                  key: "founding",
                  title: "V•PRIVILEGE Founding",
                  price: `${foundingPrice} for 12 months`,
                  text: founding.soldOut
                    ? "All Founding places have been taken."
                    : "Everything in VIP, plus a numbered Founding card and extra benefits. Card delivery included. No auto-renewal.",
                  disabled: founding.soldOut,
                },
              ] as const
            ).map((option) => (
              <label
                key={option.key}
                className={`flex cursor-pointer gap-3 rounded-lg border p-4 ${
                  plan === option.key ? "border-gold bg-gold/10 ring-1 ring-gold" : "border-gray-200"
                } ${option.disabled ? "cursor-not-allowed opacity-50" : ""}`}
              >
                <input
                  type="radio"
                  name="plan"
                  value={option.key}
                  checked={plan === option.key}
                  disabled={option.disabled}
                  onChange={() => setPlan(option.key)}
                  className="mt-1 h-4 w-4 accent-[#D4AF37]"
                />
                <span>
                  <span className="block font-semibold">{option.title}</span>
                  <span className="block text-sm font-medium text-gray-900">{option.price}</span>
                  <span className="mt-1 block text-sm text-gray-600">{option.text}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>
      )}

      <fieldset className="space-y-4">
        <legend className="mb-2 text-lg font-semibold">About you</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="first_name">First name</Label>
            <Input id="first_name" autoComplete="given-name" required value={form.first_name} onChange={set("first_name")} />
          </div>
          <div>
            <Label htmlFor="last_name">Last name</Label>
            <Input id="last_name" autoComplete="family-name" required value={form.last_name} onChange={set("last_name")} />
          </div>
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" autoComplete="email" required value={form.email} onChange={set("email")} />
          </div>
          <div>
            <Label htmlFor="phone">Mobile number</Label>
            <Input id="phone" type="tel" autoComplete="tel" required value={form.phone} onChange={set("phone")} />
          </div>
          <div>
            <Label htmlFor="dob">Date of birth</Label>
            <Input id="dob" type="date" required max={latestBirthDate()} value={form.date_of_birth} onChange={set("date_of_birth")} />
            <p className="mt-1 text-xs text-gray-500">Membership is for people aged {MIN_AGE} and over.</p>
          </div>
        </div>
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="mb-1 text-lg font-semibold">Where should we post your card?</legend>
        <p className="text-sm text-gray-600">
          {joinsFounding
            ? "UK addresses only. Delivery is included in your Founding Membership."
            : `UK addresses only. Your card is free; the ${fee} covers postage and packaging.`}
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label htmlFor="line1">Address line 1</Label>
            <Input id="line1" autoComplete="address-line1" required value={form.address_line1} onChange={set("address_line1")} />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="line2">Address line 2 (optional)</Label>
            <Input id="line2" autoComplete="address-line2" value={form.address_line2} onChange={set("address_line2")} />
          </div>
          <div>
            <Label htmlFor="city">Town or city</Label>
            <Input id="city" autoComplete="address-level2" required value={form.city} onChange={set("city")} />
          </div>
          <div>
            <Label htmlFor="postcode">Postcode</Label>
            <Input id="postcode" autoComplete="postal-code" required value={form.postcode} onChange={set("postcode")} className="uppercase" />
          </div>
        </div>
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="mb-2 text-lg font-semibold">A bit more (optional)</legend>
        <div>
          <p className="mb-2 text-sm font-medium">What are you into?</p>
          <div className="flex flex-wrap gap-2">
            {INTERESTS.map((interest) => {
              const on = interests.includes(interest);
              return (
                <button
                  key={interest}
                  type="button"
                  aria-pressed={on}
                  onClick={() => setInterests((list) => (on ? list.filter((i) => i !== interest) : [...list, interest]))}
                  className={`rounded-full border px-3 py-1 text-sm ${on ? "border-gold bg-gold/15" : "border-gray-200 text-gray-600"}`}
                >
                  {interest}
                </button>
              );
            })}
          </div>
        </div>
        {referralsOpen && (
          <div className="max-w-xs">
            <Label htmlFor="referral_code">Friend&apos;s referral code (optional)</Label>
            <Input
              id="referral_code"
              value={form.referral_code}
              onChange={set("referral_code")}
              className="uppercase tracking-widest"
              autoComplete="off"
              maxLength={20}
            />
          </div>
        )}
        <div className="max-w-xs">
          <Label htmlFor="referral">How did you hear about us?</Label>
          <select id="referral" className={selectClass} value={form.referral_source} onChange={set("referral_source")}>
            <option value="">Choose…</option>
            {REFERRAL_SOURCES.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </div>
        {!founding && (
        <label className="flex items-start gap-3 text-sm">
          <input type="checkbox" checked={interested} onChange={(e) => setInterested(e.target.checked)} className="mt-0.5 h-4 w-4 accent-[#D4AF37]" />
          <span>I&apos;m interested in the V•PRIVILEGE Founding Membership (£29.99 a year) when it launches. This doesn&apos;t commit you to anything.</span>
        </label>
        )}
      </fieldset>

      <fieldset className="space-y-3 rounded-lg border p-4">
        <legend className="px-1 text-lg font-semibold">Keeping in touch</legend>
        <p className="text-sm text-gray-600">
          We&apos;d like to tell you about events, offers and your points. Choose how, or leave these unticked: your membership works
          either way, and you can change your mind at any time.
        </p>
        {(
          [
            ["consent_email", "By email"],
            ["consent_sms", "By text message"],
            ["consent_post", "By post"],
          ] as const
        ).map(([key, label]) => (
          <label key={key} className="flex items-center gap-3 text-sm">
            <input
              type="checkbox"
              checked={consents[key]}
              onChange={(e) => setConsents((c) => ({ ...c, [key]: e.target.checked }))}
              className="h-4 w-4 accent-[#D4AF37]"
            />
            {label}
          </label>
        ))}
      </fieldset>

      <label className="flex items-start gap-3 text-sm">
        <input type="checkbox" checked={acceptTerms} onChange={(e) => setAcceptTerms(e.target.checked)} className="mt-0.5 h-4 w-4 accent-[#D4AF37]" />
        <span>
          I&apos;m {MIN_AGE} or over and I accept the{" "}
          <Link href="/membership/terms" target="_blank" className="text-gold underline">
            membership terms
          </Link>
          . I&apos;ve read the{" "}
          <Link href="/privacy" target="_blank" className="text-gold underline">
            privacy notice
          </Link>
          .
        </span>
      </label>

      {error && (
        <div role="alert" className="flex items-start gap-2 rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
          {error}
        </div>
      )}

      <div className="space-y-2">
        <Button type="submit" disabled={submitting} className="w-full bg-gold py-6 text-base text-black hover:bg-gold/90 sm:w-auto sm:px-10">
          {submitting && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
          {joinsFounding ? `Continue to pay ${foundingPrice}` : `Continue to pay ${fee} delivery`}
        </Button>
        <p className="flex items-center gap-1.5 text-xs text-gray-500">
          <Lock className="h-3.5 w-3.5" /> You&apos;ll pay on SumUp&apos;s secure page. We never see your card details.
        </p>
      </div>
    </form>
  );
}
