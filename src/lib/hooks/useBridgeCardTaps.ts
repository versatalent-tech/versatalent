"use client";

import { useEffect, useRef, useState } from "react";

export const BRIDGE_URL = "ws://localhost:9876";
const RECONNECT_DELAY_MS = 5000;

export type BridgeState = "connecting" | "ready" | "no-reader" | "unavailable";

/**
 * Listen for card taps on the USB reader via the local NFC Bridge app.
 *
 * Connects on mount, asks the bridge to report scans, and reconnects every
 * few seconds if the bridge isn't running yet or goes away. The latest
 * onTap is always used (kept in a ref), so callers can pass an inline
 * function that reads current state.
 */
export function useBridgeCardTaps(onTap: (uid: string) => void, options: { paused?: boolean } = {}) {
  const [state, setState] = useState<BridgeState>("connecting");
  const [readerName, setReaderName] = useState<string | null>(null);

  const onTapRef = useRef(onTap);
  onTapRef.current = onTap;
  const pausedRef = useRef(!!options.paused);
  pausedRef.current = !!options.paused;

  useEffect(() => {
    let ws: WebSocket | null = null;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    let stopped = false;

    const scheduleReconnect = () => {
      if (stopped || retryTimer) return;
      retryTimer = setTimeout(() => {
        retryTimer = null;
        connect();
      }, RECONNECT_DELAY_MS);
    };

    const connect = () => {
      if (stopped) return;
      try {
        ws = new WebSocket(BRIDGE_URL);
      } catch {
        setState("unavailable");
        scheduleReconnect();
        return;
      }

      ws.onopen = () => {
        ws?.send(JSON.stringify({ type: "startScanning" }));
      };

      ws.onmessage = (event) => {
        let message: any;
        try {
          message = JSON.parse(event.data);
        } catch {
          return;
        }

        switch (message.type) {
          case "connected":
          case "deviceInfo": {
            const reader = message.reader ?? message;
            const connected = reader.connected === true;
            setReaderName(connected ? message.deviceName || reader.name || null : null);
            setState(connected ? "ready" : "no-reader");
            break;
          }
          case "readerConnected":
            setReaderName(message.deviceName || null);
            setState("ready");
            break;
          case "readerDisconnected":
            setReaderName(null);
            setState("no-reader");
            break;
          case "cardScanned":
            if (message.uid && !pausedRef.current) {
              onTapRef.current(String(message.uid).toUpperCase());
            }
            break;
        }
      };

      ws.onclose = () => {
        ws = null;
        if (stopped) return;
        setState("unavailable");
        setReaderName(null);
        scheduleReconnect();
      };

      // onclose follows onerror, which handles the reconnect
      ws.onerror = () => {};
    };

    connect();

    return () => {
      stopped = true;
      if (retryTimer) clearTimeout(retryTimer);
      ws?.close();
    };
  }, []);

  return { state, readerName };
}
