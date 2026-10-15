"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AlertCircle, Instagram, Loader2, Lock, Minus, Plus, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { HONEYPOT_FIELD } from "@/lib/crm/types";
import { AGE_RANGES, HEARD_FROM, formatPrice, normaliseInstagram, type PublicTicketEvent } from "@/lib/tickets/types";

const selectClass =
  "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";

function Label({ children, htmlFor }: { children: React.ReactNode; htmlFor?: string }) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-medium">
      {children}
    </label>
  );
}

/** Where the buyer came from: campaign tags on the link, and the site that sent them */
function readTracking() {
  const params = new URLSearchParams(window.location.search);
  let referrer: string | null = null;
  try {
    if (document.referrer && new URL(document.referrer).host !== window.location.host) referrer = document.referrer.slice(0, 300);
  } catch {
    // ignore unreadable referrers
  }
  const from = params.get("from");
  return {
    source: from === "pass" ? "member_pass" : from === "card" ? "card_tap" : "website",
    utm_source: params.get("utm_source"),
    utm_medium: params.get("utm_medium"),
    utm_campaign: params.get("utm_campaign"),
    referrer,
  };
}

export function TicketPurchase({ event, poundsPerPoint }: { event: PublicTicketEvent; poundsPerPoint: number | null }) {
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    instagram: "",
    city: "",
    age_range: "",
    heard_from: "",
  });
  const [marketing, setMarketing] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [trap, setTrap] = useState("");
  const [tracking, setTracking] = useState<ReturnType<typeof readTracking> | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => setTracking(readTracking()), []);

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const onSale = event.ticket_types.filter((t) => t.on_sale);
  const currency = onSale[0]?.currency ?? "GBP";
  const { count, total } = useMemo(() => {
    let count = 0;
    let total = 0;
    for (const t of event.ticket_types) {
      const q = quantities[t.id] ?? 0;
      count += q;
      total += q * t.price_cents;
    }
    return { count, total };
  }, [quantities, event.ticket_types]);

  const change = (id: string, delta: number, max: number) =>
    setQuantities((q) => ({ ...q, [id]: Math.max(0, Math.min(max, (q[id] ?? 0) + delta)) }));

  const instagramHandle = form.instagram ? normaliseInstagram(form.instagram) : null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (count === 0) return setError("Choose at least one ticket.");
    if (!form.first_name.trim() || !form.last_name.trim()) return setError("Enter your first and last name.");
    if (!form.email.trim()) return setError("Enter your email address.");
    if (!instagramHandle) return setError("Enter your Instagram username, e.g. @yourname.");
    if (!acceptTerms) return setError("Please accept the ticket terms to continue.");

    setSubmitting(true);
    try {
      const response = await fetch("/api/tickets/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event_id: event.id,
          items: Object.entries(quantities)
            .filter(([, q]) => q > 0)
            .map(([ticket_type_id, quantity]) => ({ ticket_type_id, quantity })),
          ...form,
          marketing_consent: marketing,
          accept_terms: true,
          ...(tracking ?? {}),
          [HONEYPOT_FIELD]: trap,
        }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok || !body.success) throw new Error(body.error || "Something went wrong. Please try again.");
      window.location.href = body.data.paymentUrl ?? body.data.orderUrl; // SumUp's secure payment page, or the order for free tickets
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      setSubmitting(false);
    }
  };

  if (event.ticket_types.length === 0) {
    return <p className="rounded-lg border bg-gray-50 p-6 text-gray-600">Tickets for this event aren&apos;t on sale on our website.</p>;
  }

  return (
    <form onSubmit={submit} className="space-y-8" noValidate>
      {/* Spam trap: hidden from people */}
      <p hidden aria-hidden="true">
        <label>
          Leave empty <input value={trap} onChange={(e) => setTrap(e.target.value)} tabIndex={-1} autoComplete="off" />
        </label>
      </p>

      <fieldset className="space-y-3">
        <legend className="mb-2 text-lg font-semibold">Tickets</legend>
        {event.ticket_types.map((t) => {
          const q = quantities[t.id] ?? 0;
          return (
            <div key={t.id} className={`flex items-center justify-between gap-4 rounded-lg border p-4 ${t.on_sale ? "" : "opacity-60"}`}>
              <div className="min-w-0">
                <p className="font-medium">{t.name}</p>
                {t.description && <p className="text-sm text-gray-600">{t.description}</p>}
                <p className="mt-1 text-sm">
                  <span className="font-semibold">{formatPrice(t.price_cents, t.currency)}</span>
                  {t.note && <span className="ml-2 text-gray-500">{t.note}</span>}
                  {t.on_sale && t.remaining !== null && t.remaining <= 20 && (
                    <span className="ml-2 text-amber-700">Only {t.remaining} left</span>
                  )}
                </p>
              </div>
              {t.on_sale && (
                <div className="flex flex-shrink-0 items-center gap-2" aria-label={`Number of ${t.name} tickets`}>
                  <Button type="button" variant="outline" size="icon" className="h-9 w-9" onClick={() => change(t.id, -1, t.max_per_order)} disabled={q === 0} aria-label="One fewer">
                    <Minus className="h-4 w-4" />
                  </Button>
                  <span className="w-6 text-center font-medium tabular-nums" aria-live="polite">{q}</span>
                  <Button type="button" variant="outline" size="icon" className="h-9 w-9" onClick={() => change(t.id, 1, t.max_per_order)} disabled={q >= t.max_per_order} aria-label="One more">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          );
        })}
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="mb-2 text-lg font-semibold">Your details</legend>
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
            <Label htmlFor="phone">Phone (optional)</Label>
            <Input id="phone" type="tel" autoComplete="tel" value={form.phone} onChange={set("phone")} />
          </div>
          <div>
            <Label htmlFor="instagram">Instagram</Label>
            <div className="relative">
              <Instagram className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
              <Input
                id="instagram"
                required
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                placeholder="@yourname"
                className="pl-8"
                value={form.instagram}
                onChange={set("instagram")}
                aria-describedby="instagram-help"
              />
            </div>
            <p id="instagram-help" className={`mt-1 text-xs ${form.instagram && !instagramHandle ? "text-red-600" : "text-gray-500"}`}>
              {form.instagram && !instagramHandle ? "That doesn't look like an Instagram username" : "So we can tag you and share photos from the night"}
            </p>
          </div>
          <div>
            <Label htmlFor="city">Town or city (optional)</Label>
            <Input id="city" autoComplete="address-level2" value={form.city} onChange={set("city")} />
          </div>
          <div>
            <Label htmlFor="age_range">Age (optional)</Label>
            <select id="age_range" className={selectClass} value={form.age_range} onChange={set("age_range")}>
              <option value="">Prefer not to say</option>
              {AGE_RANGES.map((a) => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="heard_from">How did you hear about this event? (optional)</Label>
            <select id="heard_from" className={selectClass} value={form.heard_from} onChange={set("heard_from")}>
              <option value="">Choose one</option>
              {Object.entries(HEARD_FROM).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
        </div>
        {poundsPerPoint && (
          <p className="flex items-start gap-2 rounded-lg bg-gold/10 p-3 text-sm text-gray-800">
            <Star className="mt-0.5 h-4 w-4 flex-shrink-0 text-gold" />
            <span>
              V•PRIVILEGE members earn 1 point for every £{poundsPerPoint} spent on tickets. Use the email on your membership to collect
              them.{" "}
              <Link href="/membership" className="text-gold underline" target="_blank">
                Not a member yet?
              </Link>
            </span>
          </p>
        )}
      </fieldset>

      <div className="space-y-3">
        <label className="flex items-start gap-3 text-sm">
          <input type="checkbox" checked={marketing} onChange={(e) => setMarketing(e.target.checked)} className="mt-0.5 h-4 w-4 accent-[#D4AF37]" />
          <span>Tell me about future VersaTalent events and offers by email. You can unsubscribe at any time.</span>
        </label>
        <label className="flex items-start gap-3 text-sm">
          <input type="checkbox" checked={acceptTerms} onChange={(e) => setAcceptTerms(e.target.checked)} className="mt-0.5 h-4 w-4 accent-[#D4AF37]" />
          <span>
            I accept the{" "}
            <Link href="/tickets/terms" target="_blank" className="text-gold underline">
              ticket terms
            </Link>{" "}
            and I&apos;ve read the{" "}
            <Link href="/privacy" target="_blank" className="text-gold underline">
              privacy notice
            </Link>
            .
          </span>
        </label>
      </div>

      {error && (
        <div role="alert" className="flex items-start gap-2 rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
          {error}
        </div>
      )}

      <div className="space-y-2">
        <Button type="submit" disabled={submitting || onSale.length === 0} className="w-full bg-gold py-6 text-base text-black hover:bg-gold/90 sm:w-auto sm:px-10">
          {submitting && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
          {count === 0
            ? "Choose your tickets"
            : total === 0
              ? `Get ${count} free ticket${count === 1 ? "" : "s"}`
              : `Continue to pay ${formatPrice(total, currency)}`}
        </Button>
        {total > 0 && (
          <p className="flex items-center gap-1.5 text-xs text-gray-500">
            <Lock className="h-3.5 w-3.5" /> You&apos;ll pay on SumUp&apos;s secure page. We never see your card details.
          </p>
        )}
      </div>
    </form>
  );
}
