"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, CheckCircle, Loader2, PenLine } from "lucide-react";
import { cardUrl, writeCardUrl } from "@/lib/nfc-card-url";

/**
 * Writes the card's address onto the card on the USB reader, so phones
 * tapping the card open the member's page.
 */
export function WriteCardUrl({ cardUid }: { cardUid: string }) {
  const [state, setState] = useState<"idle" | "writing" | "done" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  const write = async () => {
    setState("writing");
    setError(null);
    const result = await writeCardUrl(cardUid);
    if (result.ok) {
      setState("done");
    } else {
      setError(result.error || "Writing to the card failed");
      setState("error");
    }
  };

  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-left">
      <h4 className="font-semibold mb-1">Write the address onto the card</h4>
      <p className="text-sm text-gray-600 mb-3">
        Keep the card on the reader. Phones tapping it will open:
      </p>
      <code className="block break-all rounded bg-white border border-gray-200 px-2 py-1.5 text-xs mb-3">
        {cardUrl(cardUid)}
      </code>

      {state === "done" ? (
        <div className="flex items-center gap-2 text-green-700">
          <CheckCircle className="h-5 w-5 shrink-0" />
          <span className="text-sm">Address written and checked. Tap the card with a phone to try it.</span>
        </div>
      ) : (
        <>
          {state === "error" && error && (
            <div className="mb-3 flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-2 text-sm text-red-700">
              <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}
          <Button
            onClick={write}
            disabled={state === "writing"}
            className="w-full bg-gold hover:bg-gold/90 text-white"
          >
            {state === "writing" ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Writing to card…</>
            ) : (
              <><PenLine className="h-4 w-4 mr-2" /> {state === "error" ? "Try again" : "Write to card"}</>
            )}
          </Button>
        </>
      )}
    </div>
  );
}
