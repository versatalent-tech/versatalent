/**
 * Points ledgers, rewards and claims: shapes shared by the API, pages and
 * admin. No server imports: bundled into client components.
 *
 * Two balances per member:
 * - status points decide the tier (reset each membership year)
 * - reward points are what members spend on rewards (shown as their balance)
 */

export type Ledger = 'status' | 'reward';

export const LEDGER_LABELS: Record<Ledger, string> = {
  status: 'Status points',
  reward: 'Reward points',
};

export const POINT_SOURCE_LABELS: Record<string, string> = {
  event_checkin: 'Event check-in',
  consumption: 'Purchase at an event',
  consumption_pos: 'Purchase at an event',
  manual_adjust: 'Adjustment by VersaTalent',
  tier_bonus: 'Tier bonus',
  opening_balance: 'Opening balance',
  reward_claim: 'Reward claimed',
  reward_release: 'Reward points returned',
  order_refund: 'Purchase refunded',
  year_end: 'New membership year',
};

export const REWARD_KINDS = {
  drink: 'Drink',
  upgrade: 'Ticket upgrade',
  guest_pass: 'Guest pass',
  other: 'Other',
} as const;
export type RewardKind = keyof typeof REWARD_KINDS;

export const CLAIM_STATUSES = {
  reserved: 'Ready to use',
  redeemed: 'Used',
  cancelled: 'Cancelled',
  expired: 'Expired',
} as const;
export type ClaimStatus = keyof typeof CLAIM_STATUSES;

export interface LoyaltySettings {
  rewards_open: boolean;
  /** Reward points earned as a percentage of the status points earned */
  reward_earn_percent: number;
}

export interface Reward {
  id: string;
  title: string;
  description: string | null;
  kind: RewardKind;
  point_cost: number;
  unit_cost_cents: number | null;
  stock: number | null;
  per_member_limit: number | null;
  limit_period: 'ever' | 'year';
  requires_event: boolean;
  event_ids: string[] | null;
  per_event_cap: number | null;
  book_hours_before: number;
  needs_guest_name: boolean;
  min_tier: 'silver' | 'gold' | 'black' | null;
  founding_only: boolean;
  birthday_month_only: boolean;
  claim_valid_days: number;
  valid_from: string | null;
  valid_until: string | null;
  is_active: boolean;
  sort_order: number;
}

/** Admin view: the reward plus how it's being used */
export interface RewardWithUsage extends Reward {
  reserved: number;
  redeemed: number;
  cancelled: number;
  expired: number;
}

export interface RewardClaim {
  id: string;
  reward_id: string;
  reward_title: string;
  kind: RewardKind;
  member: { id: string; name: string };
  status: ClaimStatus;
  code: string;
  points_held: number;
  unit_cost_cents: number | null;
  event: { id: string; title: string; start_time: string } | null;
  guest_name: string | null;
  expires_at: string;
  redeemed_at: string | null;
  closed_at: string | null;
  close_reason: string | null;
  claimed_by_staff: boolean;
  created_at: string;
}

export interface UpcomingEvent {
  id: string;
  title: string;
  start_time: string;
}

/** A reward as one member sees it */
export interface MemberReward {
  id: string;
  title: string;
  description: string | null;
  kind: RewardKind;
  point_cost: number;
  requires_event: boolean;
  needs_guest_name: boolean;
  book_hours_before: number;
  founding_only: boolean;
  /** Events it can be used at (event rewards only) */
  events: UpcomingEvent[];
  /** Null when they can claim it now; otherwise why not */
  blocked_reason: string | null;
}

export interface MemberRewards {
  rewards_open: boolean;
  reward_balance: number;
  status_points: number;
  rewards: MemberReward[];
  claims: RewardClaim[];
}

/** Staff lookup at the door or till */
export interface StaffRewardLookup {
  member: { id: string; name: string; tier: string; reward_balance: number; founding: boolean };
  claims: RewardClaim[];
  rewards: MemberReward[];
  rewards_open: boolean;
}

export interface LedgerEntry {
  id: string;
  ledger: Ledger;
  source: string;
  label: string;
  delta_points: number;
  balance_after: number;
  created_at: string;
  reason: string | null;
}

export interface BalanceCheck {
  user_id: string;
  name: string;
  ledger: Ledger;
  balance: number;
  ledger_sum: number;
}

export interface RewardsReport {
  members: number;
  /** Reward points members hold */
  points_outstanding: number;
  /** Claims ready to use, and what they'd cost us */
  open_claims: number;
  open_claims_cost_cents: number;
  /** Last 30 days */
  claimed_30d: number;
  redeemed_30d: number;
  redeemed_cost_30d_cents: number;
  expired_30d: number;
  /** Redeemed ÷ closed claims (redeemed + expired + cancelled), all time */
  redemption_rate: number | null;
  points_earned_30d: number;
  points_spent_30d: number;
}

/** Claim codes: no 0/O or 1/I/L, easy to read out at the bar */
export const CLAIM_CODE_ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
export const CLAIM_CODE_LENGTH = 8;

export function formatClaimCode(code: string): string {
  return code.length === 8 ? `${code.slice(0, 4)}-${code.slice(4)}` : code;
}

/** "ab12-cd34 " → "AB12CD34" */
export function normaliseClaimCode(value: string): string {
  return value.toUpperCase().replace(/[^0-9A-Z]/g, '');
}
