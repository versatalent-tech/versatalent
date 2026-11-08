"use client";

import { useCallback, useEffect, useState } from "react";
import { BellOff, BellRing, Loader2, Share } from "lucide-react";
import { api, errorMessage } from "@/components/crm/shared";

/**
 * unavailable: push isn't set up, or this browser can't do it (card hidden)
 * home-screen: iPhone/iPad Safari; push needs the portal added to the Home Screen
 * off / on: this device's push is off or on
 * blocked: the talent refused permission for this site
 */
type PushState = "loading" | "unavailable" | "home-screen" | "off" | "on" | "blocked";

const SW_URL = "/portal-sw.js";

function isAppleMobile() {
  const ua = navigator.userAgent;
  return /iPhone|iPad|iPod/.test(ua) || (ua.includes("Macintosh") && navigator.maxTouchPoints > 1);
}

function pushSupported() {
  return "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

function keyBytes(base64url: string): Uint8Array {
  const base64 = (base64url + "=".repeat((4 - (base64url.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  return Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
}

async function saveDevice(subscription: PushSubscription) {
  const json = subscription.toJSON();
  await api("/api/portal/push", { method: "POST", json: { endpoint: json.endpoint, keys: json.keys } });
}

/** Portal home card: switch phone notifications on or off for this device */
export function PushToggle() {
  const [state, setState] = useState<PushState>("loading");
  const [key, setKey] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const check = useCallback(async () => {
    const serverKey = await api<{ key: string }>("/api/portal/push/key").then((d) => d.key).catch(() => null);
    if (!serverKey) return setState("unavailable");
    setKey(serverKey);
    if (!pushSupported()) return setState(isAppleMobile() ? "home-screen" : "unavailable");
    if (Notification.permission === "denied") return setState("blocked");
    const registration = await navigator.serviceWorker.getRegistration("/portal");
    const subscription = await registration?.pushManager.getSubscription();
    if (subscription) {
      // Make sure it's saved for whoever is signed in now (e.g. a shared phone)
      await saveDevice(subscription).catch(() => undefined);
      return setState("on");
    }
    setState("off");
  }, []);

  useEffect(() => {
    check().catch(() => setState("unavailable"));
  }, [check]);

  const turnOn = async () => {
    if (!key) return;
    setBusy(true);
    setError(null);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") return setState(permission === "denied" ? "blocked" : "off");
      const registration = await navigator.serviceWorker.register(SW_URL, { scope: "/portal" });
      await navigator.serviceWorker.ready;
      const subscription =
        (await registration.pushManager.getSubscription()) ??
        (await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(key) as BufferSource }));
      await saveDevice(subscription);
      setState("on");
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const turnOff = async () => {
    setBusy(true);
    setError(null);
    try {
      const registration = await navigator.serviceWorker.getRegistration("/portal");
      const subscription = await registration?.pushManager.getSubscription();
      if (subscription) {
        await api("/api/portal/push", { method: "DELETE", json: { endpoint: subscription.endpoint } }).catch(() => undefined);
        await subscription.unsubscribe();
      }
      setState("off");
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  if (state === "loading" || state === "unavailable") return null;

  return (
    <section className="rounded-lg border border-gray-200 bg-white p-4" aria-label="Phone notifications">
      {state === "on" && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="flex items-center gap-2 text-sm text-gray-700">
            <BellRing className="h-5 w-5 text-gold" /> Notifications are on for this phone
          </p>
          <button type="button" onClick={turnOff} disabled={busy} className="text-sm text-gray-500 underline hover:text-black disabled:opacity-50">
            Turn off
          </button>
        </div>
      )}
      {state === "off" && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-medium">Get notifications on this phone</p>
            <p className="text-sm text-gray-500">New bookings, changes, reminders, to-dos and payments.</p>
          </div>
          <button
            type="button"
            onClick={turnOn}
            disabled={busy}
            className="flex items-center gap-2 rounded-md bg-black px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800 disabled:opacity-50"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <BellRing className="h-4 w-4" />} Turn on
          </button>
        </div>
      )}
      {state === "home-screen" && (
        <div>
          <p className="font-medium">Get notifications on your iPhone</p>
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-gray-600">
            <li>
              In Safari, tap Share <Share className="inline h-4 w-4 align-text-bottom" /> then <strong>Add to Home Screen</strong>.
            </li>
            <li>Open VersaTalent from your Home Screen and sign in.</li>
            <li>Come back here and tap <strong>Turn on</strong>.</li>
          </ol>
        </div>
      )}
      {state === "blocked" && (
        <p className="flex items-start gap-2 text-sm text-gray-600">
          <BellOff className="mt-0.5 h-5 w-5 shrink-0 text-gray-400" />
          Notifications are blocked for this site. Allow them in your browser’s site settings (or the phone’s Settings), then reload this page.
        </p>
      )}
      {error && <p className="mt-2 text-sm text-red-700">{error}</p>}
    </section>
  );
}
