import { randomBytes } from 'crypto';

const BASE32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
const CODE_PATTERN = /^VT-[A-Z2-7]{26}$/;

/** A ticket's QR code: "VT-" and 26 base32 characters from 16 random bytes (128 bits) */
export function newTicketCode(): string {
  const bytes = randomBytes(16);
  let bits = 0;
  let value = 0;
  let out = '';
  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += BASE32[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += BASE32[(value << (5 - bits)) & 31];
  return `VT-${out}`;
}

/** The code as stored (trimmed, upper case), or null if it isn't one of ours */
export function normaliseTicketCode(text: string): string | null {
  const code = text.trim().toUpperCase();
  return CODE_PATTERN.test(code) ? code : null;
}

export function isTicketCode(text: string): boolean {
  return normaliseTicketCode(text) !== null;
}
