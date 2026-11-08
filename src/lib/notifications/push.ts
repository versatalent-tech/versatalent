/**
 * Web Push to talents' phones and browsers. Off unless VAPID_PUBLIC_KEY,
 * VAPID_PRIVATE_KEY and VAPID_SUBJECT (a mailto: address) are set; the
 * portal bell works either way. Relative imports only.
 *
 * web-push builds and encrypts the request; it's sent with fetch so a slow
 * push service can't hold up the save that caused it (5 s timeout).
 */
import webpush from 'web-push';
import type { PushDevice } from './types';

const TIMEOUT_MS = 5_000;
const TTL_SECONDS = 86_400;

function vapid() {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;
  return publicKey && privateKey && subject ? { publicKey, privateKey, subject } : null;
}

/** Browsers' push services; devices can only be saved with one of these */
const PUSH_HOSTS = ['fcm.googleapis.com', 'android.googleapis.com', '.push.services.mozilla.com', '.push.apple.com', '.notify.windows.com'];

/**
 * Only send to real push services, so a saved device can't point the server
 * at any other address. The tests' pretend service is allowed through
 * PUSH_TEST_ORIGIN, which only scripts/e2e.mjs sets.
 */
export function isPushEndpoint(endpoint: string): boolean {
  const testOrigin = process.env.PUSH_TEST_ORIGIN;
  if (testOrigin && endpoint.startsWith(`${testOrigin}/`)) return true;
  try {
    const url = new URL(endpoint);
    return url.protocol === 'https:' && PUSH_HOSTS.some((h) => (h.startsWith('.') ? url.hostname.endsWith(h) : url.hostname === h));
  } catch {
    return false;
  }
}

export function pushConfigured(): boolean {
  return vapid() !== null;
}

/** The key browsers need to subscribe, or null when push isn't set up */
export function publicVapidKey(): string | null {
  return vapid()?.publicKey ?? null;
}

/** gone = the device unsubscribed or was reset: forget it */
export async function sendPush(
  device: PushDevice,
  payload: { title: string; body: string; link: string | null }
): Promise<'sent' | 'gone' | 'failed'> {
  const details = vapid();
  if (!details || !isPushEndpoint(device.endpoint)) return 'failed';
  try {
    const request = webpush.generateRequestDetails(
      { endpoint: device.endpoint, keys: { p256dh: device.p256dh, auth: device.auth } },
      JSON.stringify(payload),
      { vapidDetails: details, TTL: TTL_SECONDS }
    );
    const response = await fetch(request.endpoint, {
      method: request.method,
      headers: request.headers as Record<string, string>,
      body: request.body ? new Uint8Array(request.body) : undefined,
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (response.status === 404 || response.status === 410) return 'gone';
    return response.ok ? 'sent' : 'failed';
  } catch (error) {
    console.error('Push failed:', error instanceof Error ? error.message : error);
    return 'failed';
  }
}
