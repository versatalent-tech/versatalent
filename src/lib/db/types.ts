// Database model types

export type UserRole = 'artist' | 'vip' | 'staff' | 'admin';
export type NFCCardType = 'artist' | 'vip' | 'staff';
export type CheckInSource = 'artist_profile' | 'vip_pass' | 'event_checkin' | 'admin';

export interface User {
  id: string;
  name: string;
  email: string;
  password_hash?: string;
  role: UserRole;
  avatar_url?: string;
  talent_id?: string;
  created_at: Date;
  updated_at: Date;
}

export interface NFCCard {
  id: string;
  card_uid: string;
  user_id: string;
  type: NFCCardType;
  is_active: boolean;
  metadata: Record<string, any>;
  created_at: Date;
  updated_at: Date;
}

export interface NFCEvent {
  id: string;
  name: string;
  date: Date;
  location?: string;
  description?: string;
  is_active: boolean;
  metadata: Record<string, any>;
  created_at: Date;
  updated_at: Date;
}

export interface CheckIn {
  id: string;
  user_id: string;
  nfc_card_id?: string;
  event_id?: string;
  source: CheckInSource;
  timestamp: Date;
  metadata: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
}

// Join types for API responses
export interface NFCCardWithUser extends NFCCard {
  user: User;
}

export interface CheckInWithDetails extends CheckIn {
  user?: User;
  nfc_card?: NFCCard;
  event?: NFCEvent;
}

// VIP System Types
export type VIPTier = 'silver' | 'gold' | 'black';
export type VIPStatus = 'active' | 'suspended' | 'cancelled';
export type PointsSource = 'event_checkin' | 'consumption' | 'manual_adjust' | 'tier_bonus';

export interface VIPMembership {
  id: string;
  user_id: string;
  tier: VIPTier;
  points_balance: number;
  lifetime_points: number;
  status: VIPStatus;
  created_at: Date;
  updated_at: Date;
}

export interface VIPConsumption {
  id: string;
  user_id: string;
  event_id?: string;
  amount: number;
  currency: string;
  description?: string;
  created_at: Date;
}

export interface VIPPointsLog {
  id: string;
  user_id: string;
  source: PointsSource;
  ref_id?: string;
  delta_points: number;
  balance_after: number;
  metadata: Record<string, any>;
  created_at: Date;
}

export interface VIPPointRule {
  id: string;
  action_type: string;
  points_per_unit: number;
  unit: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

// Join types for VIP system
export interface VIPMembershipWithUser extends VIPMembership {
  user: User;
}

export interface VIPConsumptionWithDetails extends VIPConsumption {
  user?: User;
  event?: NFCEvent;
}

export interface VIPPointsLogWithDetails extends VIPPointsLog {
  user?: User;
}

// API request/response types
export interface CreateUserRequest {
  name: string;
  email: string;
  password?: string;
  role: UserRole;
  avatar_url?: string;
  talent_id?: string;
}

export interface UpdateUserRequest {
  name?: string;
  email?: string;
  password?: string;
  role?: UserRole;
  avatar_url?: string;
  talent_id?: string;
}

export interface CreateNFCCardRequest {
  card_uid: string;
  user_id: string;
  type: NFCCardType;
  metadata?: Record<string, any>;
}

export interface UpdateNFCCardRequest {
  card_uid?: string;
  user_id?: string;
  type?: NFCCardType;
  is_active?: boolean;
  metadata?: Record<string, any>;
}

export interface CreateEventRequest {
  name: string;
  date: Date | string;
  location?: string;
  description?: string;
  metadata?: Record<string, any>;
}

export interface UpdateEventRequest {
  name?: string;
  date?: Date | string;
  location?: string;
  description?: string;
  is_active?: boolean;
  metadata?: Record<string, any>;
}

export interface CreateCheckInRequest {
  user_id: string;
  nfc_card_id?: string;
  event_id?: string;
  source: CheckInSource;
  metadata?: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
}

// VIP System API request types
export interface CreateVIPConsumptionRequest {
  user_id: string;
  event_id?: string;
  amount: number;
  currency?: string;
  description?: string;
}

export interface ManualPointsAdjustmentRequest {
  user_id: string;
  delta_points: number;
  reason: string;
}

export interface UpdateVIPMembershipRequest {
  tier?: VIPTier;
  status?: VIPStatus;
  points_balance?: number;
}

export interface VIPPointRuleRequest {
  action_type: string;
  points_per_unit: number;
  unit: string;
  is_active?: boolean;
}
