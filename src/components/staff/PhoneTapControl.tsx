"use client";

import { Smartphone } from "lucide-react";
import type { PhoneNfcState } from "@/lib/hooks/usePhoneCardTaps";

/**
 * Switch on card taps on this phone or tablet (Android, Chrome). Shows
 * nothing on devices that can't read NFC, where the USB reader is used.
 */
export function PhoneTapControl({ state, onStart }: { state: PhoneNfcState; onStart: () => void }) {
  if (state === "unsupported") return null;
  if (state === "on") {
    return (
      <p className="flex items-center gap-2 rounded-xl border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-200" role="status">
        <Smartphone className="h-4 w-4 shrink-0" /> Phone tap is on: hold the card to the back of this device.
      </p>
    );
  }
  return (
    <div className="space-y-2 rounded-xl border border-white/10 bg-white/5 p-4">
      <button
        type="button"
        onClick={onStart}
        disabled={state === "starting"}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-gold px-4 py-3 font-semibold text-black disabled:opacity-50"
      >
        <Smartphone className="h-5 w-5" /> {state === "starting" ? "Switching on…" : "Tap cards on this device"}
      </button>
      {state === "off" && <p className="text-xs text-amber-200">NFC is switched off on this device. Turn it on in Settings, then try again.</p>}
      {state === "blocked" && (
        <p className="text-xs text-amber-200">
          NFC was refused for this site. In Chrome, tap the icon next to the address, allow NFC, then try again.
        </p>
      )}
    </div>
  );
}
