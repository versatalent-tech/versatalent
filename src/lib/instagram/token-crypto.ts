import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

/**
 * Instagram access tokens are stored encrypted with AES-256-GCM, so a copy of
 * the database alone can't be used to read anyone's account. The key is
 * INSTAGRAM_TOKEN_KEY (32 random bytes, base64). Stored as v1.<iv>.<tag>.<data>.
 */

function key(): Buffer {
  const raw = process.env.INSTAGRAM_TOKEN_KEY;
  const bytes = raw ? Buffer.from(raw, 'base64') : Buffer.alloc(0);
  if (bytes.length !== 32) throw new Error('INSTAGRAM_TOKEN_KEY must be 32 bytes, base64-encoded');
  return bytes;
}

export function encryptToken(token: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key(), iv);
  const data = Buffer.concat([cipher.update(token, 'utf8'), cipher.final()]);
  return ['v1', iv.toString('base64url'), cipher.getAuthTag().toString('base64url'), data.toString('base64url')].join('.');
}

export function decryptToken(stored: string): string {
  const [version, iv, tag, data] = stored.split('.');
  if (version !== 'v1' || !iv || !tag || !data) throw new Error('Unrecognised stored token');
  const decipher = createDecipheriv('aes-256-gcm', key(), Buffer.from(iv, 'base64url'));
  decipher.setAuthTag(Buffer.from(tag, 'base64url'));
  return Buffer.concat([decipher.update(Buffer.from(data, 'base64url')), decipher.final()]).toString('utf8');
}
