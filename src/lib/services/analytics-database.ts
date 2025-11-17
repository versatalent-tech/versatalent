import {
  AnalyticsEvent,
  AnalyticsEventType,
  AnalyticsMetrics,
  TimeSeriesDataPoint,
  AudienceDemographics,
  ContentPerformance,
  TrafficSources,
  AnalyticsFilters
} from '@/lib/types/analytics';

// Database schema interfaces
interface DatabaseEvent extends Omit<AnalyticsEvent, 'timestamp'> {
  timestamp: string; // ISO string for JSON storage
  created_at: string;
  updated_at: string;
}

interface AggregatedMetrics {
  id: string;
  talent_id: string;
  date: string;
  profile_views: number;
  portfolio_views: number;
  inquiries: number;
  bookings: number;
  social_shares: number;
  downloads: number;
  likes: number;
  unique_visitors: number;
  bounce_rate: number;
  avg_session_duration: number;
  created_at: string;
}

interface ActiveSession {
  session_id: string;
  talent_id: string;
  user_id?: string;
  last_activity: string;
  device_info: string; // JSON string
  location_info: string; // JSON string
  page_views: number;
  created_at: string;
}

// Enhanced Analytics Database Service
export class AnalyticsDatabase {
  private static instance: AnalyticsDatabase;
  private events: Map<string, DatabaseEvent> = new Map();
  private aggregatedMetrics: Map<string, AggregatedMetrics> = new Map();
  private activeSessions: Map<string, ActiveSession> = new Map();
  private realtimeSubscribers: Map<string, Set<(data: Record<string, unknown>) => void>> = new Map();

  static getInstance(): AnalyticsDatabase {
    if (!this.instance) {
      this.instance = new AnalyticsDatabase();
      this.instance.initializeDatabase();
    }
    return this.instance;
  }

  private async initializeDatabase(): Promise<void> {
    // Initialize with some mock data for immediate functionality
    await this.seedMockData();

    // Start background aggregation process
    this.startAggregationProcess();

    // Start session cleanup process
    this.startSessionCleanup();
  }

  // Event Management
  async saveEvent(event: AnalyticsEvent): Promise<DatabaseEvent> {
    const dbEvent: DatabaseEvent = {
      ...event,
      timestamp: event.timestamp.toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    this.events.set(event.id, dbEvent);

    // Update active session
    await this.updateActiveSession(event);

    // Trigger real-time updates
    this.notifyRealtimeSubscribers(event.talentId, {
      type: 'new_event',
      event: dbEvent,
      timestamp: new Date().toISOString()
    });

    // Trigger background aggregation for this talent
    this.scheduleAggregation(event.talentId);

    return dbEvent;
  }

  async getEvents(filters: Partial<AnalyticsFilters & { limit: number }>): Promise<AnalyticsEvent[]> {
    let events = Array.from(this.events.values());

    // Apply filters
    if (filters.talentIds) {
      events = events.filter(e => filters.talentIds!.includes(e.talentId));
    }

    if (filters.eventTypes) {
      events = events.filter(e => filters.eventTypes!.includes(e.eventType));
    }

    if (filters.dateRange) {
      const startTime = filters.dateRange.startDate.getTime();
      const endTime = filters.dateRange.endDate.getTime();
      events = events.filter(e => {
        const eventTime = new Date(e.timestamp).getTime();
        return eventTime >= startTime && eventTime <= endTime;
      });
    }

    if (filters.countries) {
      events = events.filter(e => {
        const location = JSON.parse(e.locationInfo as string);
        return filters.countries!.includes(location.country);
      });
    }

    if (filters.deviceTypes) {
      events = events.filter(e => {
        const device = JSON.parse(e.deviceInfo as string);
        return filters.deviceTypes!.includes(device.deviceType);
      });
    }

    // Sort by timestamp descending
    events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    // Apply limit
    if (filters.limit) {
      events = events.slice(0, filters.limit);
    }

    // Convert back to AnalyticsEvent format
    return events.map(e => ({
      ...e,
      timestamp: new Date(e.timestamp),
      deviceInfo: typeof e.deviceInfo === 'string' ? JSON.parse(e.deviceInfo) : e.deviceInfo,
      locationInfo: typeof e.locationInfo === 'string' ? JSON.parse(e.locationInfo) : e.locationInfo,
      referrerInfo: typeof e.referrerInfo === 'string' ? JSON.parse(e.referrerInfo) : e.referrerInfo
    }));
  }

  // Active Session Management
  async updateActiveSession(event: AnalyticsEvent): Promise<void> {
    const existingSession = this.activeSessions.get(event.sessionId);

    if (existingSession) {
      // Update existing session
      existingSession.last_activity = new Date().toISOString();
      existingSession.page_views += 1;
    } else {
      // Create new session
      const newSession: ActiveSession = {
        session_id: event.sessionId,
        talent_id: event.talentId,
        user_id: event.userId,
        last_activity: new Date().toISOString(),
        device_info: JSON.stringify(event.deviceInfo),
        location_info: JSON.stringify(event.locationInfo),
        page_views: 1,
        created_at: new Date().toISOString()
      };
      this.activeSessions.set(event.sessionId, newSession);
    }
  }

  async getActiveSessions(talentId: string): Promise<ActiveSession[]> {
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);

    return Array.from(this.activeSessions.values())
      .filter(session =>
        session.talent_id === talentId &&
        new Date(session.last_activity) > thirtyMinutesAgo
      );
  }

  async getActiveVisitorCount(talentId: string): Promise<number> {
    const activeSessions = await this.getActiveSessions(talentId);
    return activeSessions.length;
  }

  // Aggregated Metrics Management
  async getAggregatedMetrics(filters: AnalyticsFilters): Promise<AnalyticsMetrics> {
    const events = await this.getEvents({
      talentIds: filters.talentIds,
      dateRange: filters.dateRange,
      eventTypes: filters.eventTypes
    });

    return this.calculateMetricsFromEvents(events, filters);
  }

  async getTimeSeries(filters: AnalyticsFilters): Promise<TimeSeriesDataPoint[]> {
    const events = await this.getEvents({
      talentIds: filters.talentIds,
      dateRange: filters.dateRange
    });

    return this.generateTimeSeriesFromEvents(events, filters.dateRange);
  }

  // Real-time Subscriptions
  subscribeToRealtimeUpdates(talentId: string, callback: (data: Record<string, unknown>) => void): () => void {
    if (!this.realtimeSubscribers.has(talentId)) {
      this.realtimeSubscribers.set(talentId, new Set());
    }

    this.realtimeSubscribers.get(talentId)!.add(callback);

    // Return unsubscribe function
    return () => {
      const subscribers = this.realtimeSubscribers.get(talentId);
      if (subscribers) {
        subscribers.delete(callback);
        if (subscribers.size === 0) {
          this.realtimeSubscribers.delete(talentId);
        }
      }
    };
  }

  private notifyRealtimeSubscribers(talentId: string, data: Record<string, unknown>): void {
    const subscribers = this.realtimeSubscribers.get(talentId);
    if (subscribers) {
      subscribers.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error('Error notifying realtime subscriber:', error);
        }
      });
    }
  }

  // Background Processes
  private startAggregationProcess(): void {
    // Run aggregation every 5 minutes
    setInterval(() => {
      this.aggregateAllMetrics();
    }, 5 * 60 * 1000);
  }

  private startSessionCleanup(): void {
    // Clean up inactive sessions every 15 minutes
    setInterval(() => {
      this.cleanupInactiveSessions();
    }, 15 * 60 * 1000);
  }

  private async aggregateAllMetrics(): Promise<void> {
    const uniqueTalentIds = new Set(Array.from(this.events.values()).map(e => e.talentId));

    for (const talentId of uniqueTalentIds) {
      await this.aggregateMetricsForTalent(talentId);
    }
  }

  private async aggregateMetricsForTalent(talentId: string): Promise<void> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todayEvents = await this.getEvents({
      talentIds: [talentId],
      dateRange: { startDate: today, endDate: tomorrow }
    });

    const aggregated: AggregatedMetrics = {
      id: `${talentId}_${today.toISOString().split('T')[0]}`,
      talent_id: talentId,
      date: today.toISOString().split('T')[0],
      profile_views: todayEvents.filter(e => e.eventType === 'profile_view').length,
      portfolio_views: todayEvents.filter(e => e.eventType === 'portfolio_view').length,
      inquiries: todayEvents.filter(e => e.eventType === 'contact_inquiry').length,
      bookings: todayEvents.filter(e => e.eventType === 'booking_request').length,
      social_shares: todayEvents.filter(e => e.eventType === 'social_share').length,
      downloads: todayEvents.filter(e => e.eventType === 'download').length,
      likes: todayEvents.filter(e => e.eventType === 'like').length,
      unique_visitors: new Set(todayEvents.map(e => e.sessionId)).size,
      bounce_rate: this.calculateBounceRate(todayEvents),
      avg_session_duration: this.calculateAvgSessionDuration(todayEvents),
      created_at: new Date().toISOString()
    };

    this.aggregatedMetrics.set(aggregated.id, aggregated);

    // Notify real-time subscribers of updated metrics
    this.notifyRealtimeSubscribers(talentId, {
      type: 'metrics_updated',
      date: aggregated.date,
      metrics: aggregated,
      timestamp: new Date().toISOString()
    });
  }

  private scheduleAggregation(talentId: string): void {
    // Debounced aggregation - aggregate after 30 seconds of inactivity
    setTimeout(() => {
      this.aggregateMetricsForTalent(talentId);
    }, 30000);
  }

  private cleanupInactiveSessions(): void {
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);

    for (const [sessionId, session] of this.activeSessions.entries()) {
      if (new Date(session.last_activity) < thirtyMinutesAgo) {
        this.activeSessions.delete(sessionId);
      }
    }
  }

  // Helper Methods
  private calculateMetricsFromEvents(events: AnalyticsEvent[], filters: AnalyticsFilters): AnalyticsMetrics {
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
        returning_visitors: Math.max(0, totalSessions - uniqueSessions),
        averageSessionDuration: this.calculateAvgSessionDuration(events),
        bounceRate: this.calculateBounceRate(events),
        conversionRate: profileViews > 0 ? (inquiries / profileViews) * 100 : 0
      },
      trends: {
        profileViewsChange: 12.5, // These would be calculated against previous period
        inquiriesChange: 8.3,
        bookingsChange: 15.7,
        conversionRateChange: 5.2
      }
    };
  }

  private generateTimeSeriesFromEvents(events: AnalyticsEvent[], dateRange: { startDate: Date; endDate: Date }): TimeSeriesDataPoint[] {
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
        engagement: dayEvents.filter(e => ['like', 'social_share', 'download'].includes(e.eventType)).length,
        uniqueVisitors: new Set(dayEvents.map(e => e.sessionId)).size
      });

      current.setDate(current.getDate() + 1);
    }

    return days;
  }

  private calculateBounceRate(events: AnalyticsEvent[]): number {
    const sessions = new Map<string, AnalyticsEvent[]>();

    events.forEach(event => {
      if (!sessions.has(event.sessionId)) {
        sessions.set(event.sessionId, []);
      }
      sessions.get(event.sessionId)!.push(event);
    });

    const singlePageSessions = Array.from(sessions.values()).filter(sessionEvents =>
      sessionEvents.filter(e => e.eventType === 'profile_view' || e.eventType === 'portfolio_view').length === 1
    ).length;

    return sessions.size > 0 ? (singlePageSessions / sessions.size) * 100 : 0;
  }

  private calculateAvgSessionDuration(events: AnalyticsEvent[]): number {
    const sessions = new Map<string, { start: Date; end: Date }>();

    events.forEach(event => {
      if (!sessions.has(event.sessionId)) {
        sessions.set(event.sessionId, { start: event.timestamp, end: event.timestamp });
      } else {
        const session = sessions.get(event.sessionId)!;
        if (event.timestamp < session.start) session.start = event.timestamp;
        if (event.timestamp > session.end) session.end = event.timestamp;
      }
    });

    const durations = Array.from(sessions.values()).map(session =>
      (session.end.getTime() - session.start.getTime()) / 1000
    );

    return durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length : 0;
  }

  private async seedMockData(): Promise<void> {
    // Generate mock events for the last 30 days for demonstration
    const talents = ['antoniomonteiro', 'deejaywg', 'jessicadias', 'joaorodolfo'];
    const now = new Date();

    for (let i = 0; i < 30; i++) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);

      for (const talentId of talents) {
        // Generate 10-50 events per day per talent
        const eventCount = Math.floor(Math.random() * 40) + 10;

        for (let j = 0; j < eventCount; j++) {
          const eventTime = new Date(date.getTime() + Math.random() * 24 * 60 * 60 * 1000);
          const sessionId = `session_${eventTime.getTime()}_${Math.floor(Math.random() * 1000)}`;

          const mockEvent: AnalyticsEvent = {
            id: `event_${eventTime.getTime()}_${Math.random().toString(36).substr(2, 9)}`,
            talentId,
            eventType: this.getRandomEventType(),
            timestamp: eventTime,
            sessionId,
            metadata: { page: 'profile', source: 'web' },
            deviceInfo: {
              userAgent: 'Mozilla/5.0 (compatible; analytics)',
              deviceType: this.getRandomDeviceType(),
              browser: this.getRandomBrowser(),
              os: this.getRandomOS(),
              screenResolution: '1920x1080'
            },
            locationInfo: {
              country: this.getRandomCountry(),
              region: 'Unknown',
              city: 'Unknown',
              timezone: 'UTC'
            },
            referrerInfo: {
              source: this.getRandomSource(),
              referrer: 'https://google.com',
              utm_source: 'google',
              utm_medium: 'organic'
            }
          };

          await this.saveEvent(mockEvent);
        }
      }
    }
  }

  private getRandomEventType(): AnalyticsEventType {
    const types = ['profile_view', 'portfolio_view', 'portfolio_item_click', 'contact_inquiry', 'booking_request', 'social_share', 'download', 'like'];
    return types[Math.floor(Math.random() * types.length)];
  }

  private getRandomDeviceType(): 'mobile' | 'tablet' | 'desktop' {
    const types: ('mobile' | 'tablet' | 'desktop')[] = ['mobile', 'tablet', 'desktop'];
    return types[Math.floor(Math.random() * types.length)];
  }

  private getRandomBrowser(): string {
    const browsers = ['Chrome', 'Firefox', 'Safari', 'Edge'];
    return browsers[Math.floor(Math.random() * browsers.length)];
  }

  private getRandomOS(): string {
    const oses = ['Windows', 'macOS', 'Linux', 'iOS', 'Android'];
    return oses[Math.floor(Math.random() * oses.length)];
  }

  private getRandomCountry(): string {
    const countries = ['United States', 'United Kingdom', 'Germany', 'France', 'Canada', 'Australia', 'Brazil'];
    return countries[Math.floor(Math.random() * countries.length)];
  }

  private getRandomSource(): 'direct' | 'social' | 'search' | 'referral' {
    const sources: ('direct' | 'social' | 'search' | 'referral')[] = ['direct', 'social', 'search', 'referral'];
    return sources[Math.floor(Math.random() * sources.length)];
  }
}
