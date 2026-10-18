/**
 * V•PRIVILEGE Founding Membership shapes, shared by the public pages, the
 * API and admin. No server imports: bundled into client components.
 *
 * One-off payment for 12 months, no auto-renewal. Separate from the
 * Silver/Gold/Black tiers: it never changes a member's tier or points.
 */

export const FOUNDING_NAME = 'V•PRIVILEGE Founding Membership';
export const TERM_MONTHS = 12;
/** Members can buy their next year this many days before the current one ends */
export const RENEWAL_WINDOW_DAYS = 30;

export const PAID_MEMBERSHIP_STATUSES = {
  pending: 'Awaiting payment',
  active: 'Active',
  payment_failed: 'Payment failed',
  cancelled: 'Cancelled',
  expired: 'Expired',
  refunded: 'Refunded',
} as const;
export type PaidMembershipStatus = keyof typeof PAID_MEMBERSHIP_STATUSES;

export const IN_PERSON_METHODS = {
  sumup_reader: 'SumUp card reader',
  sumup_app: 'SumUp app',
  cash: 'Cash',
} as const;
export type InPersonMethod = keyof typeof IN_PERSON_METHODS;

export const BENEFIT_STATUSES = {
  active: 'Offered',
  paused: 'Paused',
  retired: 'Retired',
} as const;
export type BenefitStatus = keyof typeof BENEFIT_STATUSES;

export interface FoundingSettings {
  founding_on_sale: boolean;
  founding_price_cents: number;
  founding_cap: number;
}

export interface MembershipBenefit {
  id: string;
  title: string;
  description: string | null;
  limit_text: string | null;
  eligibility_text: string | null;
  owner: string | null;
  unit_cost_cents: number | null;
  status: BenefitStatus;
  sort_order: number;
}

/** The copy kept on each purchase: what the member was sold */
export interface SoldBenefit {
  title: string;
  description: string | null;
  limit_text: string | null;
  eligibility_text: string | null;
}

export interface PaidMembership {
  id: string;
  member: { id: string; name: string; email: string };
  founding_number: number | null;
  status: PaidMembershipStatus;
  /** Active and within its dates right now */
  is_current: boolean;
  /** Paid, but starts when the current year ends */
  is_upcoming: boolean;
  price_cents: number;
  currency: string;
  source: 'online' | 'in_person';
  payment_method: string | null;
  benefits: SoldBenefit[];
  terms_version: string | null;
  starts_at: string | null;
  ends_at: string | null;
  sumup_transaction_code: string | null;
  payment_reference: string | null;
  paid_at: string | null;
  needs_refund: boolean;
  notes: string | null;
  created_at: string;
}

/** What a member's pass page shows */
export interface MemberFoundingStatus {
  founding_number: number | null;
  current: { starts_at: string; ends_at: string; benefits: SoldBenefit[] } | null;
  /** A paid renewal that starts when the current year ends */
  upcoming: { starts_at: string; ends_at: string } | null;
  /** Ended within the last year (and nothing current) */
  lapsed_on: string | null;
  can_buy: boolean;
  /** Why they can't buy right now, if they can't */
  cannot_buy_reason: string | null;
  price_cents: number;
  /** What a new purchase would include */
  benefits_on_offer: SoldBenefit[];
}

/** What the door check-in screen shows */
export interface FoundingBadge {
  founding_number: number | null;
  state: 'active' | 'expired';
  ends_at: string;
}

export interface FoundingPaymentStatus {
  first_name: string;
  status: PaidMembershipStatus;
  founding_number: number | null;
  starts_at: string | null;
  ends_at: string | null;
  price_cents: number;
  /** Joined as a Founding Member: their card is posted */
  card: { status: string; postcode_hint: string } | null;
  can_retry_payment: boolean;
}

export function formatMoney(cents: number, currency = 'GBP'): string {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency }).format(cents / 100);
}

/** The benefits a purchase made now would include */
export function benefitsOnOffer(benefits: MembershipBenefit[]): SoldBenefit[] {
  return benefits
    .filter((b) => b.status === 'active')
    .sort((a, b) => a.sort_order - b.sort_order)
    .map(({ title, description, limit_text, eligibility_text }) => ({ title, description, limit_text, eligibility_text }));
}
