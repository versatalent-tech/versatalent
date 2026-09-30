"use client";

import { useState } from "react";
import { Loader2, Nfc, AlertCircle } from "lucide-react";
import { useBridgeCardTaps } from "@/lib/hooks/useBridgeCardTaps";
import { lookupCustomerByCard, type LinkedCustomer } from "@/components/pos/NFCReader";

interface CardTapListenerProps {
  onCustomerLinked: (customer: LinkedCustomer) => void;
  /** Ignore taps (e.g. while the payment screen is open) */
  paused?: boolean;
}

/**
 * Links the customer automatically when their card is tapped on the USB
 * reader (via the NFC Bridge app), and shows the reader's status.
 */
export function CardTapListener({ onCustomerLinked, paused }: CardTapListenerProps) {
  const [looking, setLooking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { state, readerName } = useBridgeCardTaps(async (uid) => {
    setLooking(true);
    setError(null);
    try {
      onCustomerLinked(await lookupCustomerByCard(uid));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to read card");
    } finally {
      setLooking(false);
    }
  }, { paused });

  const status = (() => {
    if (looking) return { dot: "bg-gold", text: "Reading card…" };
    switch (state) {
      case "ready":
        return { dot: "bg-green-500", text: paused ? "Card reader paused during payment" : "Card reader ready — tap customer card" };
      case "no-reader":
        return { dot: "bg-amber-500", text: "NFC Bridge running — plug in the card reader" };
      case "unavailable":
        return { dot: "bg-gray-400", text: "Card reader not connected — start the NFC Bridge app" };
      default:
        return { dot: "bg-gray-300", text: "Connecting to card reader…" };
    }
  })();

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-xs text-gray-600" role="status" aria-live="polite">
        {looking ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin text-gold" />
        ) : (
          <Nfc className="h-3.5 w-3.5 text-gray-400" />
        )}
        <span className={`h-2 w-2 rounded-full ${status.dot}`} />
        <span title={readerName || undefined}>{status.text}</span>
      </div>
      {error && (
        <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-2 text-xs text-red-700">
          <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
