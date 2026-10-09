/**
 * Referrals: shapes shared by the API, pages and admin. No server imports.
 *
 * A friend who joins with a member's code is attributed to them. Once the
 * friend's attendance is verified (staff check-in, or a paid till order of
 * at least the minimum), the referral is approved and the member gets reward
 * points. Anything suspicious waits for an admin.
 */

export const REFERRAL_STATUSES = {
  pending: 'Waiting for first visit',
  review: 'Needs review',
  approved: 'Approved',
  rejected: 'Rejected',
} as const;
export type ReferralStatus = keyof typeof REFERRAL_STATUSES;

export const REFERRAL_FLAGS: Record<string, string> = {
  same_phone: 'Same phone number as the referrer',
  same_address: 'Same address as the referrer',
  referrer_inactive: 'Referrer has no active membership',
  cap: 'Referrer has reached the yearly limit',
};

export interface ReferralSettings {
  /** Reward points for the member who referred */
  referrer_points: number;
  /** Reward points for the friend who joined (0 = none) */
  referee_points: number;
  /** A paid till order of at least this much counts as the first visit */
  min_order_cents: number;
  /** Most referrals approved per member in 12 months */
  yearly_cap: number;
}

export interface Referral {
  id: string;
  referrer: { id: string; name: string };
  referee: { id: string; name: string };
  code: string;
  status: ReferralStatus;
  flags: string[];
  qualified_at: string | null;
  qualified_by: 'checkin' | 'order' | null;
  decided_at: string | null;
  reject_reason: string | null;
  referrer_points: number;
  referee_points: number;
  created_at: string;
}

/** What a member sees on their pass */
export interface MemberReferralSummary {
  open: boolean;
  code: string | null;
  link: string | null;
  referrer_points: number;
  joined: number;
  approved: number;
  points_earned: number;
}

export const REFERRAL_CODE_ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
export const REFERRAL_CODE_LENGTH = 6;

export function normaliseReferralCode(value: string | null | undefined): string {
  return (value ?? '').toUpperCase().replace(/[^0-9A-Z]/g, '');
}
