"use client";

import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, Clock, Loader2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { FeeMoney, FeeRequest } from "@/lib/bookings/types";
import { api, errorMessage, formatMoney } from "@/components/crm/shared";

/** "£1,200 · 25%" */
export function moneyLabel(m: FeeMoney): string {
  return `${m.fee_cents === null ? "No fee" : formatMoney(m.fee_cents, m.currency)} · ${m.commission_percent ?? 0}%`;
}

/**
 * In the booking dialog: a manager's waiting fee change (Approve / Reject for
 * admins, Withdraw for others), or its latest decision. Nothing when there's none.
 */
export function FeeRequestBox({
  bookingId,
  current,
  canApprove,
  refreshKey,
  onDecided,
}: {
  bookingId: string;
  current: FeeMoney;
  canApprove: boolean;
  /** Change it to load the request again (e.g. after a save) */
  refreshKey: number;
  onDecided: (request: FeeRequest) => void;
}) {
  const [request, setRequest] = useState<FeeRequest | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    api<FeeRequest | null>(`/api/bookings/${bookingId}/fee-request`)
      .then(setRequest)
      .catch(() => setRequest(null));
  }, [bookingId]);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  if (!request) return null;

  const act = async (run: () => Promise<FeeRequest | null>) => {
    setBusy(true);
    setError(null);
    try {
      const decided = await run();
      if (decided) onDecided(decided);
      load();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const decide = (decision: "approve" | "reject") =>
    act(() => api<FeeRequest>(`/api/bookings/fee-requests/${request.id}`, { method: "POST", json: { decision, note } }));
  const withdraw = () => act(() => api(`/api/bookings/${bookingId}/fee-request`, { method: "DELETE" }).then(() => null));

  if (request.status === "approved") {
    return (
      <p className="flex items-center gap-2 rounded border border-green-200 bg-green-50 p-2 text-sm text-green-900">
        <CheckCircle2 className="h-4 w-4 flex-shrink-0" /> Fee change approved
      </p>
    );
  }
  if (request.status === "rejected") {
    return (
      <p className="flex items-start gap-2 rounded border border-red-200 bg-red-50 p-2 text-sm text-red-900">
        <XCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
        <span>
          Fee change not approved
          {request.decision_note ? `: ${request.decision_note}` : ""}
        </span>
      </p>
    );
  }

  return (
    <div className="space-y-2 rounded border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">
      <p className="flex items-start gap-2 font-medium">
        <Clock className="mt-0.5 h-4 w-4 flex-shrink-0" />
        <span>
          Fee change waiting for approval: {current.fee_cents === null ? "no fee" : formatMoney(current.fee_cents, current.currency)} →{" "}
          {request.fee_cents === null ? "no fee" : formatMoney(request.fee_cents, request.currency)} ({current.commission_percent ?? 0}% →{" "}
          {request.commission_percent ?? 0}%)
        </span>
      </p>
      <p className="text-xs text-amber-800">
        Requested by {request.requested_by_name ?? "a manager"}, {new Date(request.updated_at).toLocaleDateString("en-GB")}
      </p>
      {error && <p className="text-red-700">{error}</p>}
      {canApprove ? (
        <div className="flex flex-wrap items-center gap-2">
          <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note (optional)" className="h-8 max-w-xs bg-white" />
          <Button type="button" size="sm" onClick={() => decide("approve")} disabled={busy} className="bg-gold text-black hover:bg-gold/90">
            {busy && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
            Approve
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={() => decide("reject")} disabled={busy}>
            Reject
          </Button>
        </div>
      ) : (
        <Button type="button" size="sm" variant="outline" onClick={withdraw} disabled={busy}>
          Withdraw
        </Button>
      )}
    </div>
  );
}
