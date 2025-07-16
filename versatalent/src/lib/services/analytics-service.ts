import {
  AnalyticsEvent,
  AnalyticsMetrics,
  TimeSeriesDataPoint,
  AudienceDemographics,
  ContentPerformance,
  TrafficSources,
  GoalTracking,
  RealTimeAnalytics,
  DashboardAnalytics,
  AnalyticsFilters
} from '@/lib/types/analytics';

// In-memory storage for demo (in production, use a real database)
class AnalyticsStore {
  private events: Map<string, AnalyticsEvent> = new Map();
  private cache: Map<string, { data: any; timestamp: number; ttl: number }> = new Map();
  private activeVisitors: Map<string, Set<string>> = new Map(); // talentId -> sessionIds

  // Event storage
  saveEvent(event: AnalyticsEvent): AnalyticsEvent {
    this.events.set(event.id, event);

    // Track active visitors
    if (!this.activeVisitors.has(event.talentId)) {
      this.activeVisitors.set(event.talentId, new Set());
    }
    this.activeVisitors.get(event.talentId)!.add(event.sessionId);

    // Clean up old active visitors (older than 30 minutes)
    this.cleanupActiveVisitors();

    return event;
  }

  getEvents(filters: Partial<AnalyticsFilters & { limit: number }>): AnalyticsEvent[] {
    let events = Array.from(this.events.values());

    // Apply filters
    if (filters.talentIds) {
      events = events.filter(e => filters.talentIds!.includes(e.talentId));
    }

    if (filters.eventTypes) {
      events = events.filter(e => filters.eventTypes!.includes(e.eventType));
    }

    if (filters.dateRange) {
      events = events.filter(e =>
        e.timestamp >= filters.dateRange!.startDate &&
        e.timestamp <= filters.dateRange!.endDate
      );
    }

    // Sort by timestamp descending
    events.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    // Apply limit
    if (filters.limit) {
      events = events.slice(0, filters.limit);
    }

    return events;
  }

  getActiveVisitors(talentId: string): number {
    return this.activeVisitors.get(talentId)?.size || 0;
  }

  private cleanupActiveVisitors() {
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);

    for (const [talentId, sessionIds] of this.activeVisitors.entries()) {
      // Remove sessions older than 30 minutes
      const recentEvents = Array.from(this.events.values())
        .filter(e =>
          e.talentId === talentId &&
          e.timestamp > thirtyMinutesAgo
        );

      const activeSessions = new Set(recentEvents.map(e => e.sessionId));
      this.activeVisitors.set(talentId, activeSessions);
    }
  }

  // Cache management
  setCache(key: string, data: any, ttlMinutes: number = 5): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttlMinutes * 60 * 1000
    });
  }

  getCache(key: string): any | null {
    const cached = this.cache.get(key);
    if (!cached) return null;

    if (Date.now() - cached.timestamp > cached.ttl) {
      this.cache.delete(key);
      return null;
    }

    return cached.data;
  }
}

// Analytics service
export class AnalyticsService {
  private static store = new AnalyticsStore();

  // Track analytics event
  static async trackEvent(eventData: Omit<AnalyticsEvent, 'id'>): Promise<AnalyticsEvent> {
    const event: AnalyticsEvent = {
      ...eventData,
      id: `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };

    const savedEvent = this.store.saveEvent(event);

    // Invalidate related caches
    this.invalidateCache(event.talentId);

    return savedEvent;
  }

  // Get analytics events
  static async getEvents(filters: Partial<AnalyticsFilters & { limit: number }>): Promise<AnalyticsEvent[]> {
    return this.store.getEvents(filters);
  }

  // Get aggregated metrics
  static async getMetrics(filters: AnalyticsFilters): Promise<AnalyticsMetrics> {
    const cacheKey = `metrics_${JSON.stringify(filters)}`;
    const cached = this.store.getCache(cacheKey);
    if (cached) return cached;

    const events = this.store.getEvents({
      talentIds: filters.talentIds,
      dateRange: filters.dateRange,
      eventTypes: filters.eventTypes
    });

    const metrics = this.calculateMetrics(events, filters);
    this.store.setCache(cacheKey, metrics, 5); // Cache for 5 minutes

    return metrics;
  }

  // Get time series data
  static async getTimeSeries(filters: AnalyticsFilters): Promise<TimeSeriesDataPoint[]> {
    const events = this.store.getEvents({
      talentIds: filters.talentIds,
      dateRange: filters.dateRange
    });

    return this.generateTimeSeries(events, filters.dateRange);
  }

  // Get audience demographics
  static async getDemographics(filters: AnalyticsFilters): Promise<AudienceDemographics> {
    const events = this.store.getEvents({
      talentIds: filters.talentIds,
      dateRange: filters.dateRange
    });

    return this.calculateDemographics(events);
  }

  // Get content performance
  static async getContentPerformance(filters: AnalyticsFilters): Promise<ContentPerformance[]> {
    const events = this.store.getEvents({
      talentIds: filters.talentIds,
      dateRange: filters.dateRange,
      eventTypes: ['portfolio_item_click', 'like', 'share', 'download']
    });

    return this.calculateContentPerformance(events);
  }

  // Get traffic sources
  static async getTrafficSources(filters: AnalyticsFilters): Promise<TrafficSources> {
    const events = this.store.getEvents({
      talentIds: filters.talentIds,
      dateRange: filters.dateRange,
      eventTypes: ['profile_view']
    });

    return this.calculateTrafficSources(events);
  }

  // Get real-time metrics
  static async getRealTimeMetrics(talentId: string): Promise<RealTimeAnalytics> {
    const activeVisitors = this.store.getActiveVisitors(talentId);

    // Get events from last hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentEvents = this.store.getEvents({
      talentIds: [talentId],
      dateRange: { startDate: oneHourAgo, endDate: new Date() },
      limit: 50
    });

    // Get today's metrics
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayEvents = this.store.getEvents({
      talentIds: [talentId],
      dateRange: { startDate: today, endDate: new Date() }
    });

    const viewsToday = todayEvents.filter(e => e.eventType === 'profile_view').length;
    const inquiriesToday = todayEvents.filter(e => e.eventType === 'contact_inquiry').length;

    return {
      talentId,
      lastUpdated: new Date(),
      activeVisitors,
      recentEvents: recentEvents.slice(0, 10),
      liveMetrics: {
        viewsToday,
        inquiriesToday,
        topContentToday: await this.getContentPerformance({
          talentIds: [talentId],
          dateRange: { startDate: today, endDate: new Date() }
        })
      }
    };
  }

  // Get complete dashboard data
  static async getDashboardAnalytics(talentId: string, filters: AnalyticsFilters): Promise<DashboardAnalytics> {
    const [metrics, timeSeries, demographics, contentPerformance, trafficSources, realTime] = await Promise.all([
      this.getMetrics({ ...filters, talentIds: [talentId] }),
      this.getTimeSeries({ ...filters, talentIds: [talentId] }),
      this.getDemographics({ ...filters, talentIds: [talentId] }),
      this.getContentPerformance({ ...filters, talentIds: [talentId] }),
      this.getTrafficSources({ ...filters, talentIds: [talentId] }),
      this.getRealTimeMetrics(talentId)
    ]);

    // Mock goals for demo
    const goals: GoalTracking = {
      goals: [
        {
          id: 'monthly_bookings',
          name: 'Monthly Bookings',
          target: 20,
          current: metrics.metrics.bookings,
          percentage: (metrics.metrics.bookings / 20) * 100,
          timeframe: 'monthly',
          status: metrics.metrics.bookings >= 16 ? 'on-track' : 'behind'
        },
        {
          id: 'monthly_revenue',
          name: 'Monthly Revenue',
          target: 5000,
          current: metrics.metrics.bookings * 250, // $250 per booking
          percentage: ((metrics.metrics.bookings * 250) / 5000) * 100,
          timeframe: 'monthly',
          status: (metrics.metrics.bookings * 250) >= 3250 ? 'on-track' : 'behind'
        },
        {
          id: 'profile_views',
          name: 'Profile Views',
          target: 1500,
          current: metrics.metrics.profileViews,
          percentage: (metrics.metrics.profileViews / 1500) * 100,
          timeframe: 'monthly',
          status: metrics.metrics.profileViews >= 1200 ? 'on-track' : 'behind'
        }
      ]
    };

    return {
      metrics,
      timeSeries,
      demographics,
      contentPerformance,
      trafficSources,
      goals,
      realTime
    };
  }

  // Calculate trends between two periods
  static calculateTrends(current: AnalyticsMetrics, previous: AnalyticsMetrics): any {
    const calculateChange = (current: number, previous: number) => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return ((current - previous) / previous) * 100;
    };

    return {
      profileViewsChange: calculateChange(current.metrics.profileViews, previous.metrics.profileViews),
      inquiriesChange: calculateChange(current.metrics.inquiries, previous.metrics.inquiries),
      bookingsChange: calculateChange(current.metrics.bookings, previous.metrics.bookings),
      conversionRateChange: calculateChange(current.metrics.conversionRate, previous.metrics.conversionRate)
    };
  }

  // Private helper methods
  private static calculateMetrics(events: AnalyticsEvent[], filters: AnalyticsFilters): AnalyticsMetrics {
    const profileViews = events.filter(e => e.eventType === 'profile_view').length;
    const portfolioViews = events.filter(e => e.eventType === 'portfolio_view').length;
    const inquiries = events.filter(e => e.eventType === 'contact_inquiry').length;
    const bookings = events.filter(e => e.eventType === 'booking_request').length;
    const socialShares = events.filter(e => e.eventType === 'social_share').length;
    const downloads = events.filter(e => e.eventType === 'download').length;
    const likes = events.filter(e => e.eventType === 'like').length;

    const uniqueSessions = new Set(events.map(e => e.sessionId)).size;
    const totalSessions = events.filter(e => e.eventType === 'profile_view').length;

    return {
      talentId: filters.talentIds![0],
      dateRange: filters.dateRange,
      metrics: {
        profileViews,
        portfolioViews,
        inquiries,
        bookings,
        socialShares,
        downloads,
        likes,
        uniqueVisitors: uniqueSessions,
        returning_visitors: totalSessions - uniqueSessions,
        averageSessionDuration: 180, // 3 minutes average
        bounceRate: 0.35, // 35% bounce rate
        conversionRate: profileViews > 0 ? (inquiries / profileViews) * 100 : 0
      },
      trends: {
        profileViewsChange: 12.5,
        inquiriesChange: 8.3,
        bookingsChange: 15.7,
        conversionRateChange: 5.2
      }
    };
  }

  private static generateTimeSeries(events: AnalyticsEvent[], dateRange: { startDate: Date; endDate: Date }): TimeSeriesDataPoint[] {
    const days: TimeSeriesDataPoint[] = [];
    const current = new Date(dateRange.startDate);

    while (current <= dateRange.endDate) {
      const dayStart = new Date(current);
      const dayEnd = new Date(current);
      dayEnd.setHours(23, 59, 59, 999);

      const dayEvents = events.filter(e =>
        e.timestamp >= dayStart && e.timestamp <= dayEnd
      );

      days.push({
        date: current.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        profileViews: dayEvents.filter(e => e.eventType === 'profile_view').length,
        portfolioViews: dayEvents.filter(e => e.eventType === 'portfolio_view').length,
        inquiries: dayEvents.filter(e => e.eventType === 'contact_inquiry').length,
        bookings: dayEvents.filter(e => e.eventType === 'booking_request').length,
        engagement: dayEvents.filter(e => ['like', 'share', 'download'].includes(e.eventType)).length,
        uniqueVisitors: new Set(dayEvents.map(e => e.sessionId)).size
      });

      current.setDate(current.getDate() + 1);
    }

    return days;
  }

  private static calculateDemographics(events: AnalyticsEvent[]): AudienceDemographics {
    const deviceCounts = events.reduce((acc, event) => {
      acc[event.deviceInfo.deviceType] = (acc[event.deviceInfo.deviceType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const countryCounts = events.reduce((acc, event) => {
      const country = event.locationInfo.country || 'Unknown';
      acc[country] = (acc[country] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const total = events.length;

    return {
      ageGroups: [
        { ageRange: '18-24', percentage: 15, count: Math.floor(total * 0.15) },
        { ageRange: '25-34', percentage: 35, count: Math.floor(total * 0.35) },
        { ageRange: '35-44', percentage: 28, count: Math.floor(total * 0.28) },
        { ageRange: '45-54', percentage: 15, count: Math.floor(total * 0.15) },
        { ageRange: '55+', percentage: 7, count: Math.floor(total * 0.07) }
      ],
      deviceTypes: Object.entries(deviceCounts).map(([device, count]) => ({
        device: device as 'mobile' | 'tablet' | 'desktop',
        percentage: Math.round((count / total) * 100),
        count
      })),
      topCountries: Object.entries(countryCounts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)
        .map(([country, count]) => ({
          country,
          percentage: Math.round((count / total) * 100),
          count
        })),
      topCities: [
        { city: 'London', country: 'UK', count: Math.floor(total * 0.25) },
        { city: 'New York', country: 'US', count: Math.floor(total * 0.15) },
        { city: 'Berlin', country: 'Germany', count: Math.floor(total * 0.10) }
      ]
    };
  }

  private static calculateContentPerformance(events: AnalyticsEvent[]): ContentPerformance[] {
    // Mock content performance data
    return [
      {
        portfolioItemId: '1',
        title: 'Summer Campaign 2024',
        type: 'image',
        views: events.filter(e => e.metadata?.portfolioItemId === '1').length || 245,
        likes: 89,
        shares: 23,
        downloads: 12,
        engagementRate: 94
      },
      {
        portfolioItemId: '2',
        title: 'Behind the Scenes Video',
        type: 'video',
        views: 198,
        likes: 76,
        shares: 31,
        downloads: 0,
        engagementRate: 89,
        averageViewDuration: 120
      }
    ];
  }

  private static calculateTrafficSources(events: AnalyticsEvent[]): TrafficSources {
    const sourceCounts = events.reduce((acc, event) => {
      acc[event.referrerInfo.source] = (acc[event.referrerInfo.source] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const total = events.length;

    return {
      sources: Object.entries(sourceCounts).map(([source, count]) => ({
        source: source as any,
        visits: count,
        percentage: Math.round((count / total) * 100),
        conversionRate: 2.5 // Mock conversion rate
      })),
      socialSources: [
        { platform: 'Instagram', visits: 856, engagement: 4.2 },
        { platform: 'LinkedIn', visits: 432, engagement: 3.8 },
        { platform: 'Facebook', visits: 298, engagement: 2.1 }
      ],
      searchKeywords: [
        { keyword: 'talent photographer', visits: 124, position: 3 },
        { keyword: 'model portfolio', visits: 89, position: 5 }
      ]
    };
  }

  private static invalidateCache(talentId: string): void {
    // Remove all cached entries for this talent
    for (const key of this.store.cache.keys()) {
      if (key.includes(talentId)) {
        this.store.cache.delete(key);
      }
    }
  }
}
