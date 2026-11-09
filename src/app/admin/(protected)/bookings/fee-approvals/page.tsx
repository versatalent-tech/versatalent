"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SimpleMainLayout } from "@/components/layout/SimpleMainLayout";
import type { FeeMoney, FeeRequest } from "@/lib/bookings/types";
import { api, errorMessage } from "@/components/crm/shared";
import { moneyLabel } from "@/components/bookings/FeeRequestBox";

type Pending = FeeRequest & { booking_title: string; talent_name: string; starts_at: string; current: FeeMoney };

export default function FeeApprovalsPage() {
  const [items, setItems] = useState<Pending[] | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setItems(await api<Pending[]>("/api/bookings/fee-requests"));
      setError(null);
    } catch (err) {
      setError(errorMessage(err));
      setItems([]);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const decide = async (item: Pending, decision: "approve" | "reject") => {
    setBusy(item.id);
    setError(null);
    try {
      await api(`/api/bookings/fee-requests/${item.id}`, { method: "POST", json: { decision, note: notes[item.id] ?? "" } });
      setNotice(`${item.booking_title}: ${decision === "approve" ? "approved" : "not approved"}`);
      await load();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(null);
    }
  };

  return (
    <SimpleMainLayout>
      <section className="bg-gradient-to-br from-black via-gray-900 to-black py-10 md:py-12">
        <div className="container mx-auto px-4">
          <Link href="/admin/bookings" className="mb-3 inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-gold">
            <ArrowLeft className="h-4 w-4" />
            Back to calendar
          </Link>
          <h1 className="mb-1 text-3xl font-bold text-white md:text-4xl">
            Fee <span className="text-gold">Approvals</span>
          </h1>
          <p className="max-w-2xl text-gray-300">
            Managers&apos; changes to a booking&apos;s fee or commission wait here until you approve them. Approving updates the booking, the
            talent&apos;s pay and the team&apos;s shares.
          </p>
        </div>
      </section>

      <div className="min-h-[50vh] bg-gray-50 py-8">
        <div className="container mx-auto max-w-3xl space-y-4 px-4">
          {notice && <p className="rounded border border-green-200 bg-green-50 p-3 text-sm text-green-900">{notice}</p>}
          {error && <p className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}
          {!items ? (
            <Loader2 className="mx-auto mt-10 h-8 w-8 animate-spin text-gold" />
          ) : items.length === 0 ? (
            <p className="rounded-lg border bg-white p-10 text-center text-sm text-gray-500">Nothing waiting.</p>
          ) : (
            <ul className="divide-y overflow-hidden rounded-lg border bg-white">
              {items.map((item) => (
                <li key={item.id} className="space-y-2 px-4 py-4">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="font-medium">{item.booking_title}</p>
                    <p className="text-xs text-gray-500">
                      {item.talent_name} · {format(new Date(item.starts_at), "EEE d MMM yyyy")} · asked by {item.requested_by_name ?? "a manager"}
                    </p>
                  </div>
                  <p className="text-sm">
                    <span className="text-gray-500">Now: {moneyLabel(item.current)}</span>
                    <span className="mx-2 text-gray-300">→</span>
                    <span className="font-semibold">Requested: {moneyLabel(item)}</span>
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    <Input
                      value={notes[item.id] ?? ""}
                      onChange={(e) => setNotes((n) => ({ ...n, [item.id]: e.target.value }))}
                      placeholder="Note (optional)"
                      className="h-9 max-w-xs"
                    />
                    <Button size="sm" onClick={() => decide(item, "approve")} disabled={busy === item.id} className="bg-gold text-black hover:bg-gold/90">
                      {busy === item.id && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
                      Approve
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => decide(item, "reject")} disabled={busy === item.id}>
                      Reject
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </SimpleMainLayout>
  );
}
