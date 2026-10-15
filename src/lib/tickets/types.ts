/**
 * Ticket sales: shared options and helpers. No imports: used by the API,
 * the buying page and the admin.
 */

/** How long an unpaid order keeps its tickets */
export const HOLD_MINUTES = 30;

export const AGE_RANGES = ['18-24', '25-34', '35-44', '45-54', '55+'] as const;

export const HEARD_FROM = {
  instagram: 'Instagram',
  tiktok: 'TikTok',
  friend: 'A friend',
  artist: 'One of the artists',
  versatalent_card: 'A VersaTalent card',
  flyer_poster: 'Flyer or poster',
  venue: 'The venue',
  newsletter: 'Our newsletter',
  google: 'Google',
  other: 'Other',
} as const;
export type HeardFrom = keyof typeof HEARD_FROM;

export const ORDER_STATUS_LABELS: Record<string, string> = {
  pending: 'Awaiting payment',
  paid: 'Paid',
  payment_failed: 'Payment failed',
  expired: 'Expired',
  refunded: 'Refunded',
  cancelled: 'Cancelled',
};

/**
 * An Instagram handle from whatever was typed: "@name", "name",
 * "instagram.com/name" or a full link. Null if it can't be a handle.
 */
export function normaliseInstagram(input: string): string | null {
  let v = input.trim();
  const link = v.match(/^(?:https?:\/\/)?(?:www\.|m\.)?instagram\.com\/([^/?#\s]+)/i);
  if (link) v = link[1];
  v = v.replace(/^@+/, '').trim().toLowerCase();
  // Instagram usernames: letters, numbers, full stops and underscores, up to 30
  if (!/^[a-z0-9._]{1,30}$/.test(v) || v.startsWith('.') || v.endsWith('.') || v.includes('..')) return null;
  return v;
}

export function instagramUrl(handle: string): string {
  return `https://www.instagram.com/${encodeURIComponent(handle)}/`;
}

export function formatPrice(cents: number, currency = 'GBP'): string {
  if (cents === 0) return 'Free';
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency, minimumFractionDigits: cents % 100 === 0 ? 0 : 2 }).format(cents / 100);
}

/** A ticket type as the buying page sees it */
export interface PublicTicketType {
  id: string;
  name: string;
  description: string | null;
  price_cents: number;
  currency: string;
  max_per_order: number;
  /** null = no limit shown; 0 = sold out */
  remaining: number | null;
  on_sale: boolean;
  /** Why it can't be bought yet, e.g. "On sale from 1 Nov, 10:00" */
  note: string | null;
}

export interface PublicTicketEvent {
  id: string;
  title: string;
  starts_at: string;
  venue: string | null;
  image_url: string | null;
  ticket_types: PublicTicketType[];
}

/** What the buyer sees after paying */
export interface PublicOrder {
  id: string;
  reference: string;
  status: string;
  event: { id: string | null; title: string; starts_at: string | null; venue: string | null };
  first_name: string;
  email: string;
  quantity: number;
  total_cents: number;
  currency: string;
  items: { name: string; quantity: number; unit_price_cents: number }[];
  points_awarded: number;
  can_retry: boolean;
}
