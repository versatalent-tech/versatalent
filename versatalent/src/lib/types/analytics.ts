// Analytics event types
export type AnalyticsEventType =
  | 'profile_view'
  | 'portfolio_view'
  | 'portfolio_item_click'
  | 'contact_inquiry'
  | 'booking_request'
  | 'social_share'
  | 'download'
  | 'like'
  | 'portfolio_filter'
  | 'search'
  | 'page_exit';

// Raw analytics event
export interface AnalyticsEvent {
  id: string;
  talentId: string;
  eventType: AnalyticsEventType;
  timestamp: Date;
  sessionId: string;
  userId?: string;
  metadata: Record<string, any>;
  deviceInfo: {
    userAgent: string;
    deviceType: 'mobile' | 'tablet' | 'desktop';
    browser: string;
    os: string;
    screenResolution: string;
  };
  locationInfo: {
    country?: string;
    region?: string;
    city?: string;
    timezone: string;
  };
  referrerInfo: {
    source: 'direct' | 'social' | 'search' | 'referral';
    referrer?: string;
    utm_source?: string;
    utm_medium?: string;
    utm_campaign?: string;
  };
}

// Aggregated analytics data
export interface AnalyticsMetrics {
  talentId: string;
  dateRange: {
    startDate: Date;
    endDate: Date;
  };
  metrics: {
    profileViews: number;
    portfolioViews: number;
    inquiries: number;
    bookings: number;
    socialShares: number;
    downloads: number;
    likes: number;
    uniqueVisitors: number;
    returning_visitors: number;
    averageSessionDuration: number;
    bounceRate: number;
    conversionRate: number;
  };
  trends: {
    profileViewsChange: number;
    inquiriesChange: number;
    bookingsChange: number;
    conversionRateChange: number;
  };
}

// Time series data point
export interface TimeSeriesDataPoint {
  date: string;
  profileViews: number;
  portfolioViews: number;
  inquiries: number;
  bookings: number;
  engagement: number;
  uniqueVisitors: number;
}

// Audience demographics
export interface AudienceDemographics {
  ageGroups: Array<{
    ageRange: string;
    percentage: number;
    count: number;
  }>;
  deviceTypes: Array<{
    device: 'mobile' | 'tablet' | 'desktop';
    percentage: number;
    count: number;
  }>;
  topCountries: Array<{
    country: string;
    percentage: number;
    count: number;
  }>;
  topCities: Array<{
    city: string;
    country: string;
    count: number;
  }>;
}

// Content performance
export interface ContentPerformance {
  portfolioItemId: string;
  title: string;
  type: 'image' | 'video';
  views: number;
  likes: number;
  shares: number;
  downloads: number;
  engagementRate: number;
  averageViewDuration?: number;
}

// Traffic sources
export interface TrafficSources {
  sources: Array<{
    source: 'direct' | 'social' | 'search' | 'referral';
    visits: number;
    percentage: number;
    conversionRate: number;
  }>;
  socialSources: Array<{
    platform: string;
    visits: number;
    engagement: number;
  }>;
  searchKeywords: Array<{
    keyword: string;
    visits: number;
    position: number;
  }>;
}

// Goal tracking
export interface GoalTracking {
  goals: Array<{
    id: string;
    name: string;
    target: number;
    current: number;
    percentage: number;
    timeframe: 'daily' | 'weekly' | 'monthly' | 'quarterly';
    status: 'on-track' | 'behind' | 'exceeded';
  }>;
}

// Real-time analytics response
export interface RealTimeAnalytics {
  talentId: string;
  lastUpdated: Date;
  activeVisitors: number;
  recentEvents: AnalyticsEvent[];
  liveMetrics: {
    viewsToday: number;
    inquiriesToday: number;
    topContentToday: ContentPerformance[];
  };
}

// Analytics API responses
export interface AnalyticsResponse<T> {
  success: boolean;
  data: T;
  timestamp: Date;
  cached?: boolean;
  error?: string;
}

// Analytics dashboard data
export interface DashboardAnalytics {
  metrics: AnalyticsMetrics;
  timeSeries: TimeSeriesDataPoint[];
  demographics: AudienceDemographics;
  contentPerformance: ContentPerformance[];
  trafficSources: TrafficSources;
  goals: GoalTracking;
  realTime: RealTimeAnalytics;
}

// Event tracking payload
export interface EventTrackingPayload {
  eventType: AnalyticsEventType;
  talentId: string;
  metadata?: Record<string, any>;
  sessionId?: string;
}

// Analytics filters
export interface AnalyticsFilters {
  dateRange: {
    startDate: Date;
    endDate: Date;
  };
  talentIds?: string[];
  eventTypes?: AnalyticsEventType[];
  sources?: string[];
  countries?: string[];
  deviceTypes?: ('mobile' | 'tablet' | 'desktop')[];
}
