/**
 * Booking and calendar shapes shared by the API and the admin pages.
 * No server imports here: this file is bundled into client components.
 */

export const BOOKING_STATUSES = {
  hold: 'On hold',
  confirmed: 'Confirmed',
  completed: 'Completed',
  cancelled: 'Cancelled',
} as const;
export type BookingStatus = keyof typeof BOOKING_STATUSES;

export const TALENT_RESPONSES = { pending: 'Awaiting talent', accepted: 'Talent accepted', declined: 'Talent declined' } as const;
export type TalentResponse = keyof typeof TALENT_RESPONSES;

export const AVAILABILITY_KINDS = { unavailable: 'Unavailable', tentative: 'Maybe unavailable' } as const;
export type AvailabilityKind = keyof typeof AVAILABILITY_KINDS;

/** Bookings in these states block the talent's time */
export const ACTIVE_BOOKING_STATUSES: BookingStatus[] = ['hold', 'confirmed'];

/** Calendar dates are interpreted in UK time */
export const AGENCY_TIME_ZONE = 'Europe/London';

export interface Ref {
  id: string;
  name: string;
}

export interface Booking {
  id: string;
  title: string;
  status: BookingStatus;
  starts_at: string;
  ends_at: string;
  location: string | null;
  call_time: string | null;
  brief: string | null;
  logistics_notes: string | null;
  onsite_contact: { name?: string; phone?: string };
  talent: Ref;
  deal: Ref | null; // name = deal title
  client: Ref | null;
  event: Ref | null;
  client_visible_to_talent: boolean;
  shared_with_talent: boolean;
  talent_response: TalentResponse;
  /** Money fields are only sent to people allowed to see fees */
  money?: {
    fee_cents: number | null;
    currency: string;
    commission_percent: number | null;
    commission_cents: number | null;
    net_cents: number | null;
    /** Payment of the net to the talent, once recorded */
    paid_at: string | null;
    paid_cents: number | null;
    paid_reference: string | null;
  };
  created_at: string;
  updated_at: string;
}

export interface Availability {
  id: string;
  talent: Ref;
  starts_on: string; // YYYY-MM-DD, inclusive
  ends_on: string;
  kind: AvailabilityKind;
  note: string | null;
}

export interface PublicEventBlock {
  id: string;
  title: string;
  starts_at: string;
  ends_at: string | null;
  talent_names: string[];
}

export interface Clash {
  kind: 'booking' | 'availability';
  id: string;
  label: string;
  talent_name: string;
}

export interface CalendarData {
  bookings: Booking[];
  availability: Availability[];
  events: PublicEventBlock[];
}

export interface TalentRate {
  id: string;
  name: string;
  is_active: boolean;
  commission_percent: number | null;
}

export const PAYOUT_STATES = { paid: 'Paid', owed: 'To pay', upcoming: 'Not due yet', none: 'No fee set' } as const;
export type PayoutState = keyof typeof PAYOUT_STATES;

/**
 * Where a booking stands for paying the talent: owed once the job has
 * finished (confirmed or completed, with a fee) until a payment is recorded.
 */
export function payoutState(b: { status: string; ends_at: string; fee_cents: number | null; paid_at: string | null }): PayoutState {
  if (b.paid_at) return 'paid';
  if (b.fee_cents === null || (b.status !== 'confirmed' && b.status !== 'completed')) return 'none';
  return new Date(b.ends_at) <= new Date() ? 'owed' : 'upcoming';
}

/** Fee minus commission, in cents (null when there's no fee) */
export function netCents(feeCents: number | null, commissionPercent: number | null): number | null {
  if (feeCents === null) return null;
  return feeCents - commissionCents(feeCents, commissionPercent)!;
}

export function commissionCents(feeCents: number | null, commissionPercent: number | null): number | null {
  if (feeCents === null) return null;
  return Math.round((feeCents * (commissionPercent ?? 0)) / 100);
}
