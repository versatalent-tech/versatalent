"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * unsupported: this browser can't read NFC (iPhone, iPad, desktop)
 * idle: it can, but staff haven't switched it on yet (Chrome asks once)
 * on: listening; hold a card to the back of the device
 * off: NFC is switched off in the device's settings
 * blocked: permission was refused for this site
 */
export type PhoneNfcState = "unsupported" | "idle" | "starting" | "on" | "off" | "blocked";

/** The same card read twice within this time counts as one tap */
const REPEAT_MS = 1500;

/**
 * Card taps on the device itself (Chrome on Android phones and tablets with
 * NFC), alongside the USB reader via the NFC Bridge app. Reports the card's
 * serial number in the same form as the bridge: hex, upper case, no colons.
 *
 * Chrome asks for permission the first time, so staff switch it on with a
 * button (start); after that it switches itself on whenever the page opens.
 * While it's on, a card's own web address doesn't open on this device.
 */
export function usePhoneCardTaps(onTap: (uid: string) => void, options: { paused?: boolean } = {}) {
  const [state, setState] = useState<PhoneNfcState>("unsupported");
  const onTapRef = useRef(onTap);
  onTapRef.current = onTap;
  const pausedRef = useRef(!!options.paused);
  pausedRef.current = !!options.paused;
  const abortRef = useRef<AbortController | null>(null);
  const lastRef = useRef<{ uid: string; at: number } | null>(null);

  const start = useCallback(async () => {
    if (typeof window === "undefined" || !("NDEFReader" in window) || abortRef.current) return;
    const controller = new AbortController();
    abortRef.current = controller;
    setState("starting");
    try {
      // Web NFC isn't in TypeScript's DOM types
      const reader = new (window as any).NDEFReader();
      reader.addEventListener("reading", ({ serialNumber }: { serialNumber?: string }) => {
        const uid = String(serialNumber ?? "").replace(/:/g, "").toUpperCase();
        if (!uid || pausedRef.current) return;
        const now = Date.now();
        if (lastRef.current && lastRef.current.uid === uid && now - lastRef.current.at < REPEAT_MS) return;
        lastRef.current = { uid, at: now };
        onTapRef.current(uid);
      });
      await reader.scan({ signal: controller.signal });
      setState("on");
    } catch (error: any) {
      abortRef.current = null;
      if (error?.name === "NotAllowedError") setState("blocked");
      else if (error?.name === "NotReadableError" || error?.name === "NotSupportedError") setState("off");
      else setState("idle");
    }
  }, []);

  useEffect(() => {
    if (!("NDEFReader" in window)) return;
    setState("idle");
    // Already allowed on this device: switch on straight away
    navigator.permissions
      ?.query({ name: "nfc" as PermissionName })
      .then((p) => p.state === "granted" && start())
      .catch(() => undefined);
    return () => {
      abortRef.current?.abort();
      abortRef.current = null;
    };
  }, [start]);

  return { state, start };
}
