import { createECDH, randomBytes } from 'node:crypto';

export const PUSH_MOCK = 'http://127.0.0.1:4012';

/** A device's push details, with real keys so web-push can encrypt to it */
export function pushDevice(id: string) {
  const ecdh = createECDH('prime256v1');
  ecdh.generateKeys();
  return {
    endpoint: `${PUSH_MOCK}/push/${id}`,
    p256dh: ecdh.getPublicKey().toString('base64url'),
    auth: randomBytes(16).toString('base64url'),
  };
}

/** Every push the pretend push service has received */
export async function pushRequests(): Promise<{ id: string; authorization: boolean }[]> {
  return (await fetch(`${PUSH_MOCK}/__requests`)).json();
}
