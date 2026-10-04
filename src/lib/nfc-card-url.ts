import { SITE_URL } from "@/lib/site-url";
import { BRIDGE_URL } from "@/lib/hooks/useBridgeCardTaps";

const CONNECT_TIMEOUT_MS = 5000;
const WRITE_TIMEOUT_MS = 20000;

/** The address written to a card: phones tapping the card open it */
export function cardUrl(cardUid: string) {
  return `${SITE_URL}/nfc/${encodeURIComponent(cardUid)}`;
}

export interface WriteCardResult { ok: boolean; error?: string }

/**
 * Write the card's address onto the card sitting on the USB reader, via the
 * NFC Bridge app (v1.1.0+). The bridge refuses if a different card is on
 * the reader.
 */
export function writeCardUrl(cardUid: string): Promise<WriteCardResult> {
  return new Promise((resolve) => {
    let ws: WebSocket;
    let timer: ReturnType<typeof setTimeout>;
    let done = false;

    const finish = (result: WriteCardResult) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      ws?.close();
      resolve(result);
    };

    try {
      ws = new WebSocket(BRIDGE_URL);
    } catch {
      finish({ ok: false, error: "Card reader not connected — start the NFC Bridge app" });
      return;
    }

    timer = setTimeout(
      () => finish({ ok: false, error: "Card reader not connected — start the NFC Bridge app" }),
      CONNECT_TIMEOUT_MS
    );

    ws.onmessage = (event) => {
      let message: any;
      try {
        message = JSON.parse(event.data);
      } catch {
        return;
      }

      if (message.type === "connected") {
        if (!Array.isArray(message.features) || !message.features.includes("writeUrl")) {
          finish({
            ok: false,
            error: "This version of the NFC Bridge app can't write cards. Install the latest version from Admin → NFC → Setup.",
          });
          return;
        }
        clearTimeout(timer);
        timer = setTimeout(
          () => finish({ ok: false, error: "The card reader didn't respond — try again" }),
          WRITE_TIMEOUT_MS
        );
        ws.send(JSON.stringify({ type: "writeUrl", requestId: "write", url: cardUrl(cardUid), uid: cardUid }));
      } else if (message.type === "writeResult" && message.requestId === "write") {
        finish(message.ok ? { ok: true } : { ok: false, error: message.error || "Writing to the card failed" });
      }
    };

    ws.onclose = () => finish({ ok: false, error: "Card reader not connected — start the NFC Bridge app" });
    // onclose follows onerror and reports the failure
    ws.onerror = () => {};
  });
}
