"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertCircle, Banknote, CreditCard, Loader2, Smartphone } from "lucide-react";
import { formatCurrency } from "@/lib/utils/formatting";

interface SumUpCheckoutProps {
  orderId: string;
  amount: number; // pence
  currency: string;
  onSuccess: (reference: string, orderResult?: { loyalty?: { pointsAwarded?: number } }) => void;
  onCancel: () => void;
}

interface Reader {
  id: string;
  name: string;
}

// Each till remembers its own reader
const READER_STORAGE_KEY = "versatalent.pos.sumupReaderId";
const POLL_INTERVAL_MS = 2000;
// How long to wait for the reader before offering to check again
const WAIT_LIMIT_MS = 3 * 60 * 1000;

type ReaderState =
  | { step: "idle" }
  | { step: "sending" }
  | { step: "waiting"; since: number }
  | { step: "stalled" }
  | { step: "cancelling" };

async function readJson(response: Response) {
  try {
    return await response.json();
  } catch {
    return {};
  }
}

export function SumUpCheckout({ orderId, amount, currency, onSuccess, onCancel }: SumUpCheckoutProps) {
  const [tab, setTab] = useState("reader");
  const [error, setError] = useState<string | null>(null);

  // Card reader
  const [readers, setReaders] = useState<Reader[] | null>(null);
  const [readersError, setReadersError] = useState<string | null>(null);
  const [readerId, setReaderId] = useState<string>("");
  const [readerState, setReaderState] = useState<ReaderState>({ step: "idle" });
  const pollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // SumUp app / cash
  const [transactionCode, setTransactionCode] = useState("");
  const [confirming, setConfirming] = useState(false);

  const total = formatCurrency(amount, currency);
  const busy = readerState.step !== "idle" || confirming;

  const stopPolling = () => {
    if (pollTimer.current) clearTimeout(pollTimer.current);
    pollTimer.current = null;
  };
  useEffect(() => stopPolling, []);

  const finish = useCallback((reference: string, pointsAwarded?: number) => {
    stopPolling();
    onSuccess(reference, { loyalty: { pointsAwarded } });
  }, [onSuccess]);

  // Load the paired readers
  useEffect(() => {
    (async () => {
      const response = await fetch("/api/pos/sumup/readers", { credentials: "include" });
      const data = await readJson(response);
      if (!response.ok) {
        setReadersError(data.error || "Could not load card readers");
        setReaders([]);
        return;
      }
      const list: Reader[] = data.readers || [];
      setReaders(list);
      let saved: string | null = null;
      try {
        saved = localStorage.getItem(READER_STORAGE_KEY);
      } catch {}
      setReaderId(list.find((r) => r.id === saved)?.id || list[0]?.id || "");
    })().catch(() => {
      setReadersError("Could not load card readers");
      setReaders([]);
    });
  }, []);

  const pollStatus = useCallback((since: number) => {
    pollTimer.current = setTimeout(async () => {
      try {
        const response = await fetch(`/api/pos/sumup/status?orderId=${orderId}`, { credentials: "include" });
        const data = await readJson(response);
        if (response.ok && data.status === "paid") {
          finish("sumup_reader", data.pointsAwarded);
          return;
        }
        if (response.ok && data.status === "failed") {
          setReaderState({ step: "idle" });
          setError(`Payment failed: ${data.reason}. You can try again or use another method.`);
          return;
        }
        if (!response.ok && response.status !== 502) {
          setReaderState({ step: "idle" });
          setError(data.error || "Could not check the payment");
          return;
        }
      } catch {
        // Network blip: keep waiting
      }
      if (Date.now() - since > WAIT_LIMIT_MS) {
        setReaderState({ step: "stalled" });
        return;
      }
      pollStatus(since);
    }, POLL_INTERVAL_MS);
  }, [orderId, finish]);

  const sendToReader = async () => {
    if (!readerId) return;
    setError(null);
    setReaderState({ step: "sending" });
    try {
      localStorage.setItem(READER_STORAGE_KEY, readerId);
    } catch {}

    const response = await fetch("/api/pos/sumup/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ orderId, readerId }),
    });
    const data = await readJson(response);
    if (!response.ok) {
      setReaderState({ step: "idle" });
      setError(data.error || "Could not send the payment to the reader");
      return;
    }
    const since = Date.now();
    setReaderState({ step: "waiting", since });
    pollStatus(since);
  };

  const checkAgain = () => {
    const since = Date.now();
    setReaderState({ step: "waiting", since });
    pollStatus(since);
  };

  /** Stop the payment on the reader. Returns false if it's already underway. */
  const cancelOnReader = async (): Promise<boolean> => {
    stopPolling();
    setReaderState({ step: "cancelling" });
    const response = await fetch("/api/pos/sumup/cancel", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ readerId }),
    });
    if (!response.ok) {
      // The card may already be processing: keep waiting for the outcome
      const since = Date.now();
      setReaderState({ step: "waiting", since });
      setError("The payment is already in progress on the reader and can't be cancelled. Wait for it to finish.");
      pollStatus(since);
      return false;
    }
    setReaderState({ step: "idle" });
    return true;
  };

  const confirmAppPayment = async () => {
    setError(null);
    setConfirming(true);
    try {
      const response = await fetch("/api/pos/sumup/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ orderId, transactionCode }),
      });
      const data = await readJson(response);
      if (!response.ok) {
        setError(data.error || "Could not confirm the payment");
        return;
      }
      finish("sumup_app", data.pointsAwarded);
    } finally {
      setConfirming(false);
    }
  };

  const confirmCash = async () => {
    setError(null);
    setConfirming(true);
    try {
      const response = await fetch(`/api/pos/orders/${orderId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status: "paid", payment_method: "cash" }),
      });
      const data = await readJson(response);
      if (!response.ok) {
        setError(data.error || "Could not record the cash payment");
        return;
      }
      finish("cash", data.loyalty?.pointsAwarded);
    } finally {
      setConfirming(false);
    }
  };

  const handleClose = async () => {
    if (readerState.step === "waiting" || readerState.step === "stalled") {
      if (!(await cancelOnReader())) return;
    }
    stopPolling();
    onCancel();
  };

  return (
    <Dialog open onOpenChange={(open) => { if (!open) handleClose(); }}>
      <DialogContent className="sm:max-w-md" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Take payment · {total}</DialogTitle>
          <DialogDescription>Choose how the customer is paying.</DialogDescription>
        </DialogHeader>

        {error && (
          <div role="alert" className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <Tabs value={tab} onValueChange={(v) => { if (!busy) { setTab(v); setError(null); } }}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="reader" disabled={busy && tab !== "reader"}>
              <CreditCard className="h-4 w-4 mr-1" /> Reader
            </TabsTrigger>
            <TabsTrigger value="app" disabled={busy && tab !== "app"}>
              <Smartphone className="h-4 w-4 mr-1" /> SumUp app
            </TabsTrigger>
            <TabsTrigger value="cash" disabled={busy && tab !== "cash"}>
              <Banknote className="h-4 w-4 mr-1" /> Cash
            </TabsTrigger>
          </TabsList>

          {/* SumUp Solo card reader */}
          <TabsContent value="reader" className="space-y-4 pt-2">
            {readers === null ? (
              <p className="flex items-center gap-2 text-sm text-gray-600">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading card readers…
              </p>
            ) : readersError ? (
              <p className="text-sm text-gray-700">{readersError}</p>
            ) : readers.length === 0 ? (
              <p className="text-sm text-gray-700">
                No card reader is paired yet. An admin can pair one in Admin → POS → SumUp.
              </p>
            ) : readerState.step === "waiting" || readerState.step === "cancelling" ? (
              <div className="space-y-4 text-center py-4">
                <Loader2 className="h-10 w-10 mx-auto animate-spin text-gold" />
                <p className="font-medium">Waiting for the customer to pay {total} on the reader…</p>
                <p className="text-xs text-gray-500">Tap, insert or swipe the card on the SumUp reader.</p>
                <Button variant="outline" onClick={cancelOnReader} disabled={readerState.step === "cancelling"}>
                  {readerState.step === "cancelling" ? "Cancelling…" : "Cancel payment on reader"}
                </Button>
              </div>
            ) : readerState.step === "stalled" ? (
              <div className="space-y-3 text-center py-2">
                <p className="text-sm text-gray-700">No result from the reader yet. Check the reader screen.</p>
                <div className="flex justify-center gap-2">
                  <Button onClick={checkAgain} className="bg-gold hover:bg-gold/90 text-white">Check again</Button>
                  <Button variant="outline" onClick={cancelOnReader}>Cancel payment</Button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {readers.length > 1 && (
                  <Select value={readerId} onValueChange={setReaderId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a reader" />
                    </SelectTrigger>
                    <SelectContent>
                      {readers.map((r) => (
                        <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                <Button
                  onClick={sendToReader}
                  disabled={!readerId || readerState.step === "sending"}
                  className="w-full bg-gold hover:bg-gold/90 text-white"
                  size="lg"
                >
                  {readerState.step === "sending" ? (
                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Sending to reader…</>
                  ) : (
                    <>Charge {total} on {readers.find((r) => r.id === readerId)?.name || "reader"}</>
                  )}
                </Button>
              </div>
            )}
          </TabsContent>

          {/* SumUp app, e.g. Tap to Pay on iPhone */}
          <TabsContent value="app" className="space-y-3 pt-2">
            <ol className="list-decimal pl-5 text-sm text-gray-700 space-y-1">
              <li>In the SumUp app, charge <strong>{total}</strong> (Tap to Pay or a paired reader).</li>
              <li>When it succeeds, open the receipt and find the <strong>transaction code</strong>.</li>
              <li>Enter it below. We check it with SumUp before completing the order.</li>
            </ol>
            <Input
              value={transactionCode}
              onChange={(e) => setTransactionCode(e.target.value.toUpperCase().replace(/\s/g, ""))}
              placeholder="Transaction code, e.g. TEENSK4W2K"
              autoCapitalize="characters"
              disabled={confirming}
            />
            <Button
              onClick={confirmAppPayment}
              disabled={confirming || transactionCode.length < 6}
              className="w-full bg-gold hover:bg-gold/90 text-white"
            >
              {confirming ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Checking with SumUp…</> : "Confirm payment"}
            </Button>
          </TabsContent>

          {/* Cash */}
          <TabsContent value="cash" className="space-y-3 pt-2">
            <p className="text-sm text-gray-700">
              Take <strong>{total}</strong> in cash, then confirm below.
            </p>
            <Button
              onClick={confirmCash}
              disabled={confirming}
              className="w-full bg-gold hover:bg-gold/90 text-white"
            >
              {confirming ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Recording…</> : `Cash received: ${total}`}
            </Button>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end pt-2 border-t">
          <Button variant="ghost" onClick={handleClose} disabled={readerState.step === "cancelling" || confirming}>
            Cancel sale
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
