// Database model types

export type UserRole = 'artist' | 'vip' | 'staff' | 'admin';
export type NFCCardType = 'artist' | 'vip' | 'staff' | 'guest';
export type NFCCardStatus = 'active' | 'inactive' | 'blocked';
export type CheckInSource = 'artist_profile' | 'vip_pass' | 'event_checkin' | 'admin';

export interface User {
  id: string;
  name: string;
  email: string;
  password_hash?: string;
  role: UserRole;
  avatar_url?: string;
  talent_id?: string;
  stripe_customer_id?: string;
  created_at: Date;
  updated_at: Date;
}

export interface NFCCard {
  id: string;
  card_uid: string;
  user_id: string;
  type: NFCCardType;
  is_active: boolean;
  status: NFCCardStatus;
  metadata: Record<string, any>;
  created_at: Date;
  updated_at: Date;
}

export interface NFCScanLog {
  id: string;
  card_uid: string;
  nfc_card_id?: string;
  user_id?: string;
  scan_type: 'read' | 'write' | 'error';
  reader_device?: string;
  success: boolean;
  error_message?: string;
  metadata: Record<string, any>;
  created_at: Date;
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

export interface VIPTierBenefit {
  id: string;
  tier_name: VIPTier;
  title: string;
  description?: string;
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
  stripe_customer_id?: string;
}

export interface CreateNFCCardRequest {
  card_uid: string;
  user_id: string;
  type: NFCCardType;
  status?: NFCCardStatus;
  metadata?: Record<string, any>;
}

export interface UpdateNFCCardRequest {
  card_uid?: string;
  user_id?: string;
  type?: NFCCardType;
  is_active?: boolean;
  status?: NFCCardStatus;
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

export interface CreateTierBenefitRequest {
  tier_name: VIPTier;
  title: string;
  description?: string;
  is_active?: boolean;
}

export interface UpdateTierBenefitRequest {
  title?: string;
  description?: string;
  is_active?: boolean;
}

// Events System Types
export type EventType = 'performance' | 'photoshoot' | 'match' | 'collaboration' | 'workshop' | 'appearance';
export type EventStatus = 'upcoming' | 'ongoing' | 'completed' | 'cancelled';

export interface EventVenue {
  name: string;
  address: string;
  city: string;
  country: string;
  capacity?: number;
  website?: string;
}

export interface EventPrice {
  min: number;
  max?: number;
  currency: string;
  isFree?: boolean;
}

export interface Event {
  id: string;
  title: string;
  slug?: string;
  description: string;
  type: EventType;
  status: EventStatus;
  start_time: Date;
  end_time?: Date;
  display_time?: string;
  venue: EventVenue;
  image_url?: string;
  featured: boolean;
  tickets_url?: string;
  price?: EventPrice;
  tags: string[];
  organizer?: string;
  expected_attendance?: number;
  talent_ids: string[];
  is_published: boolean;
  created_at: Date;
  updated_at: Date;
}

// API request types for Events
export interface CreateEventRequest {
  title: string;
  slug?: string;
  description: string;
  type: EventType;
  status?: EventStatus;
  start_time: Date | string;
  end_time?: Date | string;
  display_time?: string;
  venue: EventVenue;
  image_url?: string;
  featured?: boolean;
  tickets_url?: string;
  price?: EventPrice;
  tags?: string[];
  organizer?: string;
  expected_attendance?: number;
  talent_ids?: string[];
  is_published?: boolean;
}

export interface UpdateEventRequest {
  title?: string;
  slug?: string;
  description?: string;
  type?: EventType;
  status?: EventStatus;
  start_time?: Date | string;
  end_time?: Date | string;
  display_time?: string;
  venue?: EventVenue;
  image_url?: string;
  featured?: boolean;
  tickets_url?: string;
  price?: EventPrice;
  tags?: string[];
  organizer?: string;
  expected_attendance?: number;
  talent_ids?: string[];
  is_published?: boolean;
}

// Talents System Types
export type Industry = 'acting' | 'modeling' | 'music' | 'culinary' | 'sports';
export type Gender = 'male' | 'female' | 'non-binary';
export type AgeGroup = 'child' | 'teen' | 'young-adult' | 'adult' | 'senior';

export interface PortfolioItem {
  id: string;
  title: string;
  description: string;
  type: 'image' | 'video';
  thumbnailUrl?: string;
  url: string;
  date?: string;
  category?: string;
  photographer?: string;
  location?: string;
  client?: string;
  year?: number;
  featured?: boolean;
  professional?: boolean;
  tags?: string[];
  downloadUrl?: string;
  metadata?: {
    camera?: string;
    lens?: string;
    iso?: string;
    aperture?: string;
  };
}

export interface SocialLinks {
  instagram?: string;
  twitter?: string;
  youtube?: string;
  website?: string;
  linkedin?: string;
  tiktok?: string;
}

// Industry-specific details interfaces
export interface ModelingDetails {
  height?: string; // e.g., "5'10" or "178cm"
  chest?: string;
  waist?: string;
  hips?: string;
  shoe_size?: string;
  dress_size?: string;
  top_size?: string;
  bottom_size?: string;
  hair_colour?: string;
  hair_style?: string;
  eye_colour?: string;
}

export interface SportsDetails {
  positions_played?: string[];
  teams_played?: string[];
  current_team?: string;
  goals_scored?: number;
  assists?: number;
  league_played?: string;
  team_position_in_league?: string;
  sport_type?: string; // football, basketball, etc.
}

export interface MusicDetails {
  genre?: string[];
  record_label?: string;
  years_active?: string;
  instruments?: string[];
  streaming_links?: {
    spotify?: string;
    apple_music?: string;
    soundcloud?: string;
  };
}

export interface ActingDetails {
  acting_type?: string[]; // film, TV, theatre, commercials
  agencies?: string[];
  notable_roles?: string[];
  training?: string[];
}

export interface CulinaryDetails {
  cuisine_specialties?: string[];
  restaurants?: string[];
  certifications?: string[];
  tv_appearances?: string[];
}

// Union type for all industry details
export type IndustryDetails = ModelingDetails | SportsDetails | MusicDetails | ActingDetails | CulinaryDetails;

export interface Talent {
  id: string;
  name: string;
  industry: Industry;
  gender: Gender;
  age_group: AgeGroup;
  profession: string;
  location: string;
  bio: string;
  tagline: string;
  skills: string[];
  image_src: string;
  cover_image?: string;
  featured: boolean;
  is_active: boolean;
  social_links?: SocialLinks;
  portfolio?: PortfolioItem[];
  industry_details?: IndustryDetails; // Industry-specific fields
  created_at: Date;
  updated_at: Date;
}

// API request types for Talents
export interface CreateTalentRequest {
  name: string;
  industry: Industry;
  gender: Gender;
  age_group: AgeGroup;
  profession: string;
  location: string;
  bio: string;
  tagline: string;
  skills: string[];
  image_src: string;
  cover_image?: string;
  featured?: boolean;
  is_active?: boolean;
  social_links?: SocialLinks;
  portfolio?: PortfolioItem[];
  industry_details?: IndustryDetails;
}

export interface UpdateTalentRequest {
  name?: string;
  industry?: Industry;
  gender?: Gender;
  age_group?: AgeGroup;
  profession?: string;
  location?: string;
  bio?: string;
  tagline?: string;
  skills?: string[];
  image_src?: string;
  cover_image?: string;
  featured?: boolean;
  is_active?: boolean;
  social_links?: SocialLinks;
  portfolio?: PortfolioItem[];
  industry_details?: IndustryDetails;
}

// ============================================
// POS (Point of Sale) System Types
// ============================================

export type OrderStatus = 'pending' | 'paid' | 'cancelled' | 'failed';

export interface Product {
  id: string;
  name: string;
  description?: string;
  price_cents: number;
  currency: string;
  category?: string;
  image_url?: string;
  is_active: boolean;
  stock_quantity: number;
  low_stock_threshold?: number;
  created_at: Date;
  updated_at: Date;
}

export interface POSOrder {
  id: string;
  staff_user_id?: string;
  customer_user_id?: string;
  total_cents: number;
  currency: string;
  stripe_payment_intent_id?: string;
  status: OrderStatus;
  notes?: string;
  created_at: Date;
  updated_at: Date;
}

export interface POSOrderItem {
  id: string;
  order_id: string;
  product_id?: string;
  product_name: string;
  quantity: number;
  unit_price_cents: number;
  line_total_cents: number;
  created_at: Date;
}

// Join types for POS
export interface POSOrderWithDetails extends POSOrder {
  staff_user?: User;
  customer_user?: User;
  items: POSOrderItem[];
}

export interface POSOrderItemWithProduct extends POSOrderItem {
  product?: Product;
}

// ============================================
// Purchase History Types (Stripe Integration)
// ============================================

export interface PurchaseHistoryItem {
  id: string;
  product_id?: string;
  product_name: string;
  quantity: number;
  unit_price_cents: number;
  line_total_cents: number;
}

export interface PurchaseHistoryOrder {
  id: string;
  order_date: Date;
  total_cents: number;
  currency: string;
  status: OrderStatus;
  stripe_payment_intent_id?: string;
  items: PurchaseHistoryItem[];
  notes?: string;
  staff_user?: {
    id: string;
    name: string;
  };
}

export interface UserPurchaseHistory {
  user_id: string;
  user_name: string;
  user_email: string;
  stripe_customer_id?: string;
  total_orders: number;
  total_spent_cents: number;
  currency: string;
  orders: PurchaseHistoryOrder[];
}

export interface PurchaseHistoryStats {
  total_orders: number;
  total_items_purchased: number;
  total_spent_cents: number;
  average_order_value_cents: number;
  most_purchased_items: Array<{
    product_name: string;
    total_quantity: number;
    total_spent_cents: number;
  }>;
  first_purchase_date?: Date;
  last_purchase_date?: Date;
}

// ============================================
// Inventory Management Types
// ============================================

export type InventoryMovementReason = 'pos_sale' | 'manual_adjustment' | 'restock' | 'damage' | 'theft' | 'return';

export interface InventoryMovement {
  id: string;
  product_id: string;
  change_amount: number;
  reason: InventoryMovementReason;
  related_order_id?: string;
  staff_user_id?: string;
  notes?: string;
  created_at: Date;
}

export interface InventoryMovementWithDetails extends InventoryMovement {
  product_name?: string;
  staff_name?: string;
  order_total?: number;
}

export interface CreateInventoryMovementRequest {
  product_id: string;
  change_amount: number;
  reason: InventoryMovementReason;
  related_order_id?: string;
  staff_user_id?: string;
  notes?: string;
}

export interface ProductWithStockStatus extends Product {
  stock_status: 'in-stock' | 'low-stock' | 'out-of-stock';
}

// ============================================
// Staff Authentication Types
// ============================================

export interface StaffLoginRequest {
  email: string;
  password: string;
}

export interface StaffLoginResponse {
  success: boolean;
  user?: {
    id: string;
    name: string;
    email: string;
    role: UserRole;
  };
  error?: string;
}

export interface StaffAuthCheck {
  authenticated: boolean;
  user?: {
    id: string;
    name: string;
    email: string;
    role: UserRole;
  };
}

// ============================================
// NFC Integration Types
// ============================================

export interface NFCAttachRequest {
  card_uid: string;
  pos_order_id: string;
}

export interface NFCAttachResponse {
  success: boolean;
  customer?: {
    id: string;
    name: string;
    email: string;
    vip?: {
      tier: VIPTier;
      points_balance: number;
      lifetime_points: number;
    };
  };
  error?: string;
}

// ============================================
// POS VIP Integration Types
// ============================================

export interface POSLoyaltyResult {
  success: boolean;
  pointsAwarded?: number;
  newBalance?: number;
  error?: string;
}

export interface POSOrderWithLoyalty extends POSOrder {
  loyalty?: POSLoyaltyResult;
}

// API request types for POS
export interface CreateProductRequest {
  name: string;
  description?: string;
  price_cents: number;
  currency?: string;
  category?: string;
  image_url?: string;
  is_active?: boolean;
  stock_quantity?: number;
}

export interface UpdateProductRequest {
  name?: string;
  description?: string;
  price_cents?: number;
  currency?: string;
  category?: string;
  image_url?: string;
  is_active?: boolean;
  stock_quantity?: number;
}

export interface CreatePOSOrderRequest {
  staff_user_id?: string;
  customer_user_id?: string;
  items: Array<{
    product_id: string;
    quantity: number;
  }>;
  notes?: string;
}

export interface UpdatePOSOrderRequest {
  status?: OrderStatus;
  stripe_payment_intent_id?: string;
  notes?: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
}
