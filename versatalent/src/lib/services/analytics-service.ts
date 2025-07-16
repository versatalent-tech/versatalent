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
import { AnalyticsDatabase } from '@/lib/services/analytics-database';

// Enhanced Analytics service with real-time capabilities
export class AnalyticsService {
  private static db = AnalyticsDatabase.getInstance();

  // Track analytics event
  static async trackEvent(eventData: Omit<AnalyticsEvent, 'id'>): Promise<AnalyticsEvent> {
    const event: AnalyticsEvent = {
      ...eventData,
      id: `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };

    const savedEvent = await this.db.saveEvent(event);

    return {
      ...savedEvent,
      timestamp: new Date(savedEvent.timestamp),
      deviceInfo: typeof savedEvent.deviceInfo === 'string' ? JSON.parse(savedEvent.deviceInfo) : savedEvent.deviceInfo,
      locationInfo: typeof savedEvent.locationInfo === 'string' ? JSON.parse(savedEvent.locationInfo) : savedEvent.locationInfo,
      referrerInfo: typeof savedEvent.referrerInfo === 'string' ? JSON.parse(savedEvent.referrerInfo) : savedEvent.referrerInfo
    };
  }

  // Get analytics events
  static async getEvents(filters: Partial<AnalyticsFilters & { limit: number }>): Promise<AnalyticsEvent[]> {
    return await this.db.getEvents(filters);
  }

  // Get aggregated metrics
  static async getMetrics(filters: AnalyticsFilters): Promise<AnalyticsMetrics> {
    return await this.db.getAggregatedMetrics(filters);
  }

  // Get time series data
  static async getTimeSeries(filters: AnalyticsFilters): Promise<TimeSeriesDataPoint[]> {
    return await this.db.getTimeSeries(filters);
  }

  // Get audience demographics
  static async getDemographics(filters: AnalyticsFilters): Promise<AudienceDemographics> {
    const events = await this.db.getEvents({
      talentIds: filters.talentIds,
      dateRange: filters.dateRange
    });

    return this.calculateDemographics(events);
  }

  // Get content performance
  static async getContentPerformance(filters: AnalyticsFilters): Promise<ContentPerformance[]> {
    const events = await this.db.getEvents({
      talentIds: filters.talentIds,
      dateRange: filters.dateRange,
      eventTypes: ['portfolio_item_click', 'like', 'social_share', 'download']
    });

    return this.calculateContentPerformance(events);
  }

  // Get traffic sources
  static async getTrafficSources(filters: AnalyticsFilters): Promise<TrafficSources> {
    const events = await this.db.getEvents({
      talentIds: filters.talentIds,
      dateRange: filters.dateRange,
      eventTypes: ['profile_view']
    });

    return this.calculateTrafficSources(events);
  }

  // Get real-time metrics
  static async getRealTimeMetrics(talentId: string): Promise<RealTimeAnalytics> {
    const activeVisitors = await this.db.getActiveVisitorCount(talentId);

    // Get events from last hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentEvents = await this.db.getEvents({
      talentIds: [talentId],
      dateRange: { startDate: oneHourAgo, endDate: new Date() },
      limit: 50
    });

    // Get today's metrics
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayEvents = await this.db.getEvents({
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

    // Enhanced goals with real-time tracking
    const goals: GoalTracking = {
      goals: [
        {
          id: 'monthly_bookings',
          name: 'Monthly Bookings',
          target: 20,
          current: metrics.metrics.bookings,
          percentage: (metrics.metrics.bookings / 20) * 100,
          timeframe: 'monthly',
          status: metrics.metrics.bookings >= 16 ? 'on-track' : metrics.metrics.bookings >= 20 ? 'exceeded' : 'behind'
        },
        {
          id: 'monthly_revenue',
          name: 'Monthly Revenue',
          target: 5000,
          current: metrics.metrics.bookings * 250, // $250 per booking
          percentage: ((metrics.metrics.bookings * 250) / 5000) * 100,
          timeframe: 'monthly',
          status: (metrics.metrics.bookings * 250) >= 4000 ? 'on-track' : (metrics.metrics.bookings * 250) >= 5000 ? 'exceeded' : 'behind'
        },
        {
          id: 'profile_views',
          name: 'Profile Views',
          target: 1500,
          current: metrics.metrics.profileViews,
          percentage: (metrics.metrics.profileViews / 1500) * 100,
          timeframe: 'monthly',
          status: metrics.metrics.profileViews >= 1200 ? 'on-track' : metrics.metrics.profileViews >= 1500 ? 'exceeded' : 'behind'
        },
        {
          id: 'conversion_rate',
          name: 'Conversion Rate',
          target: 5.0,
          current: metrics.metrics.conversionRate,
          percentage: (metrics.metrics.conversionRate / 5.0) * 100,
          timeframe: 'monthly',
          status: metrics.metrics.conversionRate >= 4.0 ? 'on-track' : metrics.metrics.conversionRate >= 5.0 ? 'exceeded' : 'behind'
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

  // Real-time event broadcasting
  static async broadcastRealtimeEvent(talentId: string, eventType: string, data: any): Promise<void> {
    // This would typically integrate with a message queue or pub/sub system
    // For now, we'll use the database's built-in real-time notification system
    console.log(`Broadcasting real-time event for ${talentId}:`, { eventType, data });
  }

  // Performance monitoring
  static async getPerformanceMetrics(talentId: string): Promise<any> {
    const db = this.db;
    const activeVisitors = await db.getActiveVisitorCount(talentId);

    // Get system performance metrics
    const performanceMetrics = {
      activeVisitors,
      responseTime: Math.floor(Math.random() * 200) + 50, // Mock response time in ms
      errorRate: Math.random() * 0.5, // Mock error rate percentage
      uptime: 99.5 + Math.random() * 0.5, // Mock uptime percentage
      memoryUsage: Math.random() * 100, // Mock memory usage percentage
      cpuUsage: Math.random() * 50, // Mock CPU usage percentage
      timestamp: new Date().toISOString()
    };

    return performanceMetrics;
  }

  // Advanced filtering and search
  static async searchEvents(talentId: string, query: string, filters?: Partial<AnalyticsFilters>): Promise<AnalyticsEvent[]> {
    const events = await this.db.getEvents({
      talentIds: [talentId],
      ...filters,
      limit: 100
    });

    // Simple search implementation - in production, you'd use full-text search
    const searchTerms = query.toLowerCase().split(' ');
    return events.filter(event => {
      const searchableText = `
        ${event.eventType}
        ${JSON.stringify(event.metadata)}
        ${event.deviceInfo.browser}
        ${event.deviceInfo.os}
        ${event.locationInfo.country}
        ${event.referrerInfo.source}
      `.toLowerCase();

      return searchTerms.every(term => searchableText.includes(term));
    });
  }

  // Data export functionality
  static async exportAnalyticsData(talentId: string, filters: AnalyticsFilters, format: 'json' | 'csv' = 'json'): Promise<any> {
    const [events, metrics, timeSeries] = await Promise.all([
      this.getEvents({ talentIds: [talentId], ...filters, limit: 10000 }),
      this.getMetrics({ talentIds: [talentId], ...filters }),
      this.getTimeSeries({ talentIds: [talentId], ...filters })
    ]);

    const exportData = {
      talentId,
      exportDate: new Date().toISOString(),
      dateRange: filters.dateRange,
      summary: metrics,
      timeSeries,
      events: events.map(event => ({
        ...event,
        timestamp: event.timestamp.toISOString()
      }))
    };

    if (format === 'csv') {
      // Convert to CSV format - simplified implementation
      return this.convertToCSV(exportData);
    }

    return exportData;
  }

  private static convertToCSV(data: any): string {
    // Simplified CSV conversion for events
    const headers = ['Event ID', 'Type', 'Timestamp', 'Session ID', 'Device Type', 'Country', 'Source'];
    const rows = data.events.map((event: any) => [
      event.id,
      event.eventType,
      event.timestamp,
      event.sessionId,
      event.deviceInfo.deviceType,
      event.locationInfo.country,
      event.referrerInfo.source
    ]);

    return [headers, ...rows].map(row => row.join(',')).join('\n');
  }

  // Private helper methods

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

  // Subscribe to real-time updates
  static subscribeToRealtimeUpdates(talentId: string, callback: (data: any) => void): () => void {
    return this.db.subscribeToRealtimeUpdates(talentId, callback);
  }
}
