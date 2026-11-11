"use client";

import { useEffect, useRef, useState } from "react";
import { CameraOff, Loader2, X } from "lucide-react";

/** The same code read again within this time counts as one scan */
const REPEAT_MS = 3000;

/**
 * The device's camera reading ticket QR codes (Android and iPhone). Calls
 * onCode with each code read; the parent shows the result.
 */
export function TicketScanner({ onCode, onClose, paused }: { onCode: (code: string) => void; onClose: () => void; paused?: boolean }) {
  const video = useRef<HTMLVideoElement>(null);
  const [state, setState] = useState<"starting" | "on" | "failed">("starting");
  const onCodeRef = useRef(onCode);
  onCodeRef.current = onCode;
  const pausedRef = useRef(!!paused);
  pausedRef.current = !!paused;
  const last = useRef<{ code: string; at: number } | null>(null);

  useEffect(() => {
    let stopped = false;
    let scanner: { start: () => Promise<void>; destroy: () => void } | null = null;
    (async () => {
      try {
        const { default: QrScanner } = await import("qr-scanner");
        if (stopped || !video.current) return;
        scanner = new QrScanner(
          video.current,
          (result) => {
            const now = Date.now();
            if (pausedRef.current) return;
            if (last.current && last.current.code === result.data && now - last.current.at < REPEAT_MS) return;
            last.current = { code: result.data, at: now };
            onCodeRef.current(result.data);
          },
          { returnDetailedScanResult: true, highlightScanRegion: true, preferredCamera: "environment" }
        );
        await scanner.start();
        if (!stopped) setState("on");
      } catch {
        if (!stopped) setState("failed");
      }
    })();
    return () => {
      stopped = true;
      scanner?.destroy();
    };
  }, []);

  return (
    <div className="relative w-full overflow-hidden rounded-2xl border border-white/10 bg-black">
      <button
        type="button"
        onClick={onClose}
        className="absolute right-2 top-2 z-10 rounded-full bg-black/60 p-2 text-white hover:bg-black"
        aria-label="Close scanner"
      >
        <X className="h-5 w-5" />
      </button>
      <video ref={video} className={`aspect-square w-full object-cover ${state === "failed" ? "hidden" : ""}`} muted playsInline />
      {state === "starting" && (
        <div className="absolute inset-0 flex items-center justify-center">
          <Loader2 className="h-10 w-10 animate-spin text-gold" />
        </div>
      )}
      {state === "failed" && (
        <div className="flex flex-col items-center gap-3 p-8 text-center">
          <CameraOff className="h-10 w-10 text-amber-300" />
          <p className="text-lg font-semibold">The camera couldn&apos;t start</p>
          <p className="text-sm text-gray-300">
            Allow camera access for this site in the browser&apos;s settings, then open the scanner again. Or use Find a ticket to look the
            person up by name.
          </p>
        </div>
      )}
      {state === "on" && <p className="p-3 text-center text-sm text-gray-300">Hold the ticket&apos;s QR code in the square</p>}
    </div>
  );
}
