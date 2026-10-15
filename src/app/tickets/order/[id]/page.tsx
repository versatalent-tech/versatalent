"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { CheckCircle2, Clock, Loader2, Star, Ticket, XCircle } from "lucide-react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { formatPrice, type PublicOrder } from "@/lib/tickets/types";

const when = (value: string) =>
  new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London",
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));

/** The buyer's order, after paying on SumUp (or for free tickets). The link holds a private key. */
function OrderContent() {
  const { id } = useParams<{ id: string }>();
  const token = useSearchParams().get("k") ?? "";
  const [order, setOrder] = useState<PublicOrder | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [checks, setChecks] = useState(0);
  const [paying, setPaying] = useState(false);

  const load = useCallback(async () => {
    try {
      const response = await fetch(`/api/tickets/orders/${encodeURIComponent(id)}?k=${encodeURIComponent(token)}`, { cache: "no-store" });
      const body = await response.json();
      if (!body.success) throw new Error(body.error);
      setOrder(body.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "We couldn't find your order");
    }
  }, [id, token]);

  useEffect(() => {
    load();
  }, [load]);

  // SumUp can take a few seconds to confirm
  useEffect(() => {
    if (order?.status !== "pending" || checks >= 6) return;
    const timer = setTimeout(() => {
      setChecks((c) => c + 1);
      load();
    }, 3000);
    return () => clearTimeout(timer);
  }, [order, checks, load]);

  const payAgain = async () => {
    setPaying(true);
    setError(null);
    try {
      const response = await fetch(`/api/tickets/orders/${encodeURIComponent(id)}/pay`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ k: token }),
      });
      const body = await response.json();
      if (!body.success) throw new Error(body.error);
      window.location.href = body.data.paymentUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Payment couldn't start");
      setPaying(false);
    }
  };

  if (error && !order) return <p className="rounded border border-red-200 bg-red-50 p-4 text-red-800">{error}</p>;
  if (!order) return <Loader2 className="mx-auto h-8 w-8 animate-spin text-gold" />;

  const summary = (
    <div className="rounded-lg border p-5 text-left">
      <p className="text-sm uppercase tracking-widest text-gray-500">Order reference</p>
      <p className="font-mono text-2xl font-bold tracking-wider">{order.reference}</p>
      <div className="mt-4 space-y-1 text-sm text-gray-700">
        <p className="font-semibold text-gray-900">{order.event.title}</p>
        {order.event.starts_at && <p>{when(order.event.starts_at)}</p>}
        {order.event.venue && <p>{order.event.venue}</p>}
      </div>
      <ul className="mt-4 space-y-1 border-t pt-4 text-sm">
        {order.items.map((item) => (
          <li key={item.name} className="flex justify-between gap-4">
            <span>
              {item.quantity} × {item.name}
            </span>
            <span>{formatPrice(item.quantity * item.unit_price_cents, order.currency)}</span>
          </li>
        ))}
        <li className="flex justify-between gap-4 border-t pt-2 font-semibold">
          <span>Total</span>
          <span>{formatPrice(order.total_cents, order.currency)}</span>
        </li>
      </ul>
    </div>
  );

  if (order.status === "paid") {
    return (
      <div className="space-y-6 text-center">
        <CheckCircle2 className="mx-auto h-14 w-14 text-green-600" />
        <h1 className="text-3xl font-bold">You&apos;re going, {order.first_name}!</h1>
        <p className="text-gray-600">
          {order.quantity === 1 ? "Your ticket is" : `Your ${order.quantity} tickets are`} booked. At the door, give your name or show this
          page. Save or screenshot it now: this link is private to you.
        </p>
        {summary}
        {order.points_awarded > 0 && (
          <p className="flex items-center justify-center gap-2 rounded-lg bg-gold/10 p-3 text-sm">
            <Star className="h-4 w-4 text-gold" /> {order.points_awarded} V•PRIVILEGE points added to your membership.
          </p>
        )}
        {order.event.id && (
          <Link href={`/events/${order.event.id}`} className="inline-block text-gold underline">
            Event details
          </Link>
        )}
      </div>
    );
  }

  if (order.status === "pending") {
    return (
      <div className="space-y-4 text-center">
        {checks < 6 ? <Loader2 className="mx-auto h-12 w-12 animate-spin text-gold" /> : <Clock className="mx-auto h-12 w-12 text-gold" />}
        <h1 className="text-2xl font-bold">{checks < 6 ? "Confirming your payment…" : "We haven't received your payment yet"}</h1>
        <p className="text-gray-600">
          {checks < 6
            ? "This usually takes a few seconds."
            : "If you paid, it can take a minute to confirm: refresh this page shortly. If you didn't finish paying, you can pay now."}
        </p>
        {summary}
        {checks >= 6 && (
          <Button onClick={payAgain} disabled={paying} className="bg-gold text-black hover:bg-gold/90">
            {paying && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Pay now
          </Button>
        )}
        {error && <p className="text-sm text-red-700">{error}</p>}
      </div>
    );
  }

  if (order.can_retry) {
    return (
      <div className="space-y-4 text-center">
        <XCircle className="mx-auto h-12 w-12 text-red-500" />
        <h1 className="text-2xl font-bold">{order.status === "expired" ? "Your payment page expired" : "Your payment didn't go through"}</h1>
        <p className="text-gray-600">You haven&apos;t been charged. You can try again; we&apos;ll keep your tickets if they&apos;re still available.</p>
        {summary}
        <Button onClick={payAgain} disabled={paying} className="bg-gold text-black hover:bg-gold/90">
          {paying && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Try again
        </Button>
        {error && <p className="text-sm text-red-700">{error}</p>}
      </div>
    );
  }

  return (
    <div className="space-y-4 text-center">
      <Ticket className="mx-auto h-12 w-12 text-gray-400" />
      <h1 className="text-2xl font-bold">{order.status === "refunded" ? "This order was refunded" : "This order was cancelled"}</h1>
      {summary}
    </div>
  );
}

export default function TicketOrderPage() {
  return (
    <MainLayout>
      <section className="bg-white py-12">
        <div className="container mx-auto max-w-xl px-4">
          <Suspense fallback={<Loader2 className="mx-auto h-8 w-8 animate-spin text-gold" />}>
            <OrderContent />
          </Suspense>
        </div>
      </section>
    </MainLayout>
  );
}
