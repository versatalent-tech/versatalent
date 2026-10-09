"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, Clock, Loader2, XCircle } from "lucide-react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import type { ApplicationStatus } from "@/lib/membership/types";

function Welcome() {
  const id = useSearchParams().get("r") ?? "";
  const [status, setStatus] = useState<ApplicationStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [checks, setChecks] = useState(0);
  const [paying, setPaying] = useState(false);

  const load = useCallback(async () => {
    try {
      const response = await fetch(`/api/membership/status?r=${encodeURIComponent(id)}`, { cache: "no-store" });
      const body = await response.json();
      if (!body.success) throw new Error(body.error);
      setStatus(body.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "We couldn't find your application");
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  // The payment can take a few seconds to confirm: check again a few times
  useEffect(() => {
    if (status?.payment_status !== "pending" || checks >= 6) return;
    const timer = setTimeout(() => {
      setChecks((c) => c + 1);
      load();
    }, 3000);
    return () => clearTimeout(timer);
  }, [status, checks, load]);

  const payAgain = async () => {
    setPaying(true);
    setError(null);
    try {
      const response = await fetch("/api/membership/pay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ request_id: id }),
      });
      const body = await response.json();
      if (!body.success) throw new Error(body.error);
      window.location.href = body.data.paymentUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Payment couldn't start");
      setPaying(false);
    }
  };

  if (error && !status) return <p className="rounded border border-red-200 bg-red-50 p-4 text-red-800">{error}</p>;
  if (!status) return <Loader2 className="mx-auto h-8 w-8 animate-spin text-gold" />;

  const fee = new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(status.fee_cents / 100);
  const paid = status.payment_status === "paid" || status.payment_status === "waived";

  if (paid) {
    return (
      <div className="space-y-4 text-center">
        <CheckCircle2 className="mx-auto h-14 w-14 text-green-600" />
        <h1 className="text-3xl font-bold">Welcome to VersaTalent VIP, {status.first_name}!</h1>
        <p className="text-gray-600">
          {status.status === "posted"
            ? "Your card is on its way."
            : `Payment received. We'll post your card to your address (${status.postcode_hint}), usually within 5 working days.`}
        </p>
        <p className="text-gray-600">
          When it arrives, bring it to our next event and tap in at the door to start collecting points.
        </p>
        <Button asChild className="bg-gold text-black hover:bg-gold/90">
          <Link href="/events">See upcoming events</Link>
        </Button>
      </div>
    );
  }

  if (status.payment_status === "pending" && checks < 6) {
    return (
      <div className="space-y-4 text-center">
        <Clock className="mx-auto h-12 w-12 text-gold" />
        <h1 className="text-2xl font-bold">Confirming your payment…</h1>
        <p className="text-gray-600">This usually takes a few seconds.</p>
        <Loader2 className="mx-auto h-6 w-6 animate-spin text-gold" />
      </div>
    );
  }

  return (
    <div className="space-y-4 text-center">
      <XCircle className="mx-auto h-12 w-12 text-amber-600" />
      <h1 className="text-2xl font-bold">Your application is saved, {status.first_name}</h1>
      <p className="text-gray-600">
        {status.payment_status === "expired"
          ? "The payment page timed out before payment."
          : status.payment_status === "failed"
            ? "The payment didn't go through. You haven't been charged."
            : "We haven't received the delivery payment yet."}{" "}
        Pay the {fee} delivery fee to have your card posted.
      </p>
      {error && <p className="text-sm text-red-700">{error}</p>}
      {status.can_retry_payment && (
        <Button onClick={payAgain} disabled={paying} className="bg-gold text-black hover:bg-gold/90">
          {paying && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Pay {fee} now
        </Button>
      )}
      <p className="text-xs text-gray-500">
        Paid but still seeing this? Refresh in a minute, or contact us at versatalent.management@gmail.com.
      </p>
    </div>
  );
}

export default function MembershipWelcomePage() {
  return (
    <MainLayout>
      <section className="flex min-h-[60vh] items-center bg-gray-50 py-16">
        <div className="container mx-auto max-w-xl px-4">
          <Suspense fallback={<Loader2 className="mx-auto h-8 w-8 animate-spin text-gold" />}>
            <Welcome />
          </Suspense>
        </div>
      </section>
    </MainLayout>
  );
}
