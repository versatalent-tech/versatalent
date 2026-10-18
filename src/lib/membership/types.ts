/**
 * Membership sign-up shapes shared by the public pages, the API and admin.
 * No server imports: bundled into client components.
 */

export const MIN_AGE = 18;

export const CARD_REQUEST_STATUSES = {
  awaiting_payment: 'Awaiting payment',
  to_post: 'To post',
  card_assigned: 'Card ready',
  posted: 'Posted',
  cancelled: 'Cancelled',
} as const;
export type CardRequestStatus = keyof typeof CARD_REQUEST_STATUSES;

export const PAYMENT_STATUSES = {
  pending: 'Not paid',
  paid: 'Paid',
  failed: 'Payment failed',
  expired: 'Payment expired',
  waived: 'Fee waived',
  refunded: 'Refunded',
  included: 'Included in Founding Membership',
} as const;
export type CardPaymentStatus = keyof typeof PAYMENT_STATUSES;

export interface ProgrammeSettings {
  signup_open: boolean;
  card_delivery_fee_cents: number;
  terms_version: string;
}

export interface CardRequest {
  id: string;
  status: CardRequestStatus;
  member: { id: string; name: string; email: string; phone: string | null };
  recipient_name: string;
  address_line1: string;
  address_line2: string | null;
  city: string;
  postcode: string;
  country: string;
  fee_cents: number;
  currency: string;
  payment_status: CardPaymentStatus;
  sumup_transaction_code: string | null;
  paid_at: string | null;
  card: { id: string; uid: string } | null;
  posted_at: string | null;
  tracking_reference: string | null;
  notes: string | null;
  founding_interest: boolean;
  /** Joined as a Founding Member: the membership payment covers this card */
  joins_founding: boolean;
  /** Money arrived that we don't need (e.g. paid twice): refund in SumUp */
  needs_refund: boolean;
  created_at: string;
}

/** What the public "thank you" page may show (no full address or email) */
export interface ApplicationStatus {
  first_name: string;
  payment_status: CardPaymentStatus;
  status: CardRequestStatus;
  postcode_hint: string; // e.g. "LS1 ••"
  fee_cents: number;
  can_retry_payment: boolean;
}

/** UK date of birth → whole years of age today (UK time) */
export function ageOn(dateOfBirth: string, today: Date = new Date()): number {
  const ukToday = new Date(today.toLocaleString('en-US', { timeZone: 'Europe/London' }));
  const [y, m, d] = dateOfBirth.split('-').map(Number);
  let age = ukToday.getFullYear() - y;
  const beforeBirthday = ukToday.getMonth() + 1 < m || (ukToday.getMonth() + 1 === m && ukToday.getDate() < d);
  if (beforeBirthday) age -= 1;
  return age;
}

/** Age in years → the VIP profile age band */
export function ageRangeFor(age: number): string {
  if (age < 25) return '18-24';
  if (age < 35) return '25-34';
  if (age < 45) return '35-44';
  if (age < 55) return '45-54';
  if (age < 65) return '55-64';
  return '65+';
}

const UK_POSTCODE = /^([A-Z]{1,2}\d[A-Z\d]?)\s*(\d[A-Z]{2})$/i;

/** "ls11ab" → "LS1 1AB"; null if it isn't a UK postcode */
export function normaliseUkPostcode(value: string): string | null {
  const match = value.trim().toUpperCase().match(UK_POSTCODE);
  return match ? `${match[1]} ${match[2]}` : null;
}
