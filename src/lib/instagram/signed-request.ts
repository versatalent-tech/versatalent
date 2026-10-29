import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Meta's callbacks (deauthorize, data deletion) send a `signed_request`:
 * base64url(signature).base64url(JSON payload), where the signature is
 * HMAC-SHA256 of the encoded payload with the app secret. Returns the
 * payload's user ID, or null if the signature doesn't match.
 */
export function parseSignedRequest(signedRequest: string, appSecret: string): { userId: string } | null {
  const [encodedSignature, encodedPayload] = signedRequest.split('.', 2);
  if (!encodedSignature || !encodedPayload) return null;

  const expected = createHmac('sha256', appSecret).update(encodedPayload).digest();
  const given = Buffer.from(encodedSignature, 'base64url');
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;

  try {
    const payload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8'));
    if (String(payload.algorithm ?? '').toUpperCase() !== 'HMAC-SHA256') return null;
    const userId = payload.user_id ?? payload.user?.id;
    return userId ? { userId: String(userId) } : null;
  } catch {
    return null;
  }
}

/** Reads signed_request from a form-encoded (or JSON) POST body */
export async function readSignedRequest(request: Request): Promise<string | null> {
  const type = request.headers.get('content-type') ?? '';
  if (type.includes('application/json')) {
    const body = await request.json().catch(() => null);
    return typeof body?.signed_request === 'string' ? body.signed_request : null;
  }
  const form = await request.formData().catch(() => null);
  const value = form?.get('signed_request');
  return typeof value === 'string' ? value : null;
}
