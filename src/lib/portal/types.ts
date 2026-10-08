/**
 * Talent portal shapes, shared by the API and the portal pages.
 * Nothing here may carry a gross fee, commission or hidden client name.
 */
import type { BookingStatus, PayoutState, TalentResponse } from '@/lib/bookings/types';

export type Tier = 'silver' | 'gold' | 'black';
export const TIER_LABELS: Record<Tier, string> = { silver: 'Silver', gold: 'Gold', black: 'Black' };

export interface TalentBooking {
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
  /** Only when the agency chose to show it for this booking */
  client_name: string | null;
  /** What the talent receives (fee minus commission); null when not set yet */
  net_cents: number | null;
  currency: string;
  talent_response: TalentResponse;
  can_respond: boolean;
  /** paid / owed (job done, not paid yet) / upcoming / none (no fee or not going ahead) */
  payout: PayoutState;
  /** When paid: the date and the amount actually paid */
  paid_at: string | null;
  paid_cents: number | null;
}

export interface TalentAvailability {
  id: string;
  starts_on: string;
  ends_on: string;
  kind: 'unavailable' | 'tentative';
  note: string | null;
}

export interface EarningsSummary {
  currency_totals: {
    currency: string;
    /** Paid out in the current calendar year */
    paid_this_year: number;
    /** Jobs done but not paid yet */
    owed: number;
    /** Confirmed jobs still to come */
    upcoming: number;
  }[];
  bookings: TalentBooking[];
}

export interface ArtistPerk {
  id: string;
  title: string;
  description: string | null;
  min_tier: Tier | null;
  valid_until: string | null;
  just_for_you: boolean;
  unlocked: boolean;
}

export interface PointsEntry {
  id: string;
  source: string;
  delta_points: number;
  balance_after: number;
  label: string;
  created_at: string;
}

export interface RewardsSummary {
  membership: {
    tier: Tier;
    points_balance: number;
    lifetime_points: number;
    status_points: number;
    year_ends: string;
    next_tier: Tier | null;
    points_to_next: number | null;
    points_to_keep: number;
    discount_percent: number;
  } | null;
  history: PointsEntry[];
  tier_benefits: { title: string; description: string | null }[];
  perks: ArtistPerk[];
}

export const EDITABLE_SOCIALS = ['instagram', 'tiktok', 'youtube', 'twitter', 'linkedin', 'website'] as const;
export type EditableSocial = (typeof EDITABLE_SOCIALS)[number];

export interface ProfileFields {
  tagline: string;
  bio: string;
  location: string;
  skills: string[];
  social_links: Partial<Record<EditableSocial, string>>;
}

export interface ProfileChangeRequest {
  id: string;
  talent: { id: string; name: string };
  submitted_by_name: string | null;
  changes: Partial<ProfileFields>;
  note: string | null;
  status: 'pending' | 'approved' | 'rejected' | 'withdrawn';
  review_note: string | null;
  created_at: string;
  reviewed_at: string | null;
}

export interface PortalProfile {
  talent_id: string;
  name: string;
  profession: string;
  image_src: string | null;
  current: ProfileFields;
  pending: ProfileChangeRequest | null;
  last_decision: ProfileChangeRequest | null;
}

export interface PortalHome {
  name: string;
  talent_name: string;
  profession: string;
  image_src: string | null;
  next_bookings: TalentBooking[];
  awaiting_response: TalentBooking[];
  points_balance: number | null;
  tier: Tier | null;
  unlocked_perks: number;
}

/** Admin-side view of each talent's portal login */
export interface TalentLogin {
  talent_id: string;
  talent_name: string;
  is_active_talent: boolean;
  user: {
    id: string;
    name: string;
    email: string;
    has_password: boolean;
    is_active: boolean;
    last_login_at: string | null;
    link_expires_at: string | null;
  } | null;
}

export interface AdminPerk {
  id: string;
  title: string;
  description: string | null;
  talent: { id: string; name: string } | null;
  min_tier: Tier | null;
  valid_from: string | null;
  valid_until: string | null;
  is_active: boolean;
  sort_order: number;
}
