"use client";

import { useCallback, useEffect, useRef, useState } from 'react';
import { AnalyticsEventType, EventTrackingPayload, DashboardAnalytics, AnalyticsFilters } from '@/lib/types/analytics';

// Session management
class SessionManager {
  private static sessionId: string | null = null;
  private static sessionStart: number = 0;

  static getSessionId(): string {
    if (!this.sessionId || Date.now() - this.sessionStart > 30 * 60 * 1000) { // 30 minutes
      this.sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      this.sessionStart = Date.now();

      if (typeof window !== 'undefined') {
        sessionStorage.setItem('analytics_session_id', this.sessionId);
        sessionStorage.setItem('analytics_session_start', this.sessionStart.toString());
      }
    }
    return this.sessionId;
  }

  static initFromStorage(): void {
    if (typeof window !== 'undefined') {
      const storedSessionId = sessionStorage.getItem('analytics_session_id');
      const storedSessionStart = sessionStorage.getItem('analytics_session_start');

      if (storedSessionId && storedSessionStart) {
        const startTime = parseInt(storedSessionStart);
        if (Date.now() - startTime < 30 * 60 * 1000) { // 30 minutes
          this.sessionId = storedSessionId;
          this.sessionStart = startTime;
        }
      }
    }
  }
}

// Initialize session from storage
if (typeof window !== 'undefined') {
  SessionManager.initFromStorage();
}

// Analytics API client
class AnalyticsAPI {
  private static baseUrl = '/api/analytics';

  static async trackEvent(payload: EventTrackingPayload): Promise<void> {
    try {
      await fetch(`${this.baseUrl}/events`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...payload,
          sessionId: SessionManager.getSessionId()
        })
      });
    } catch (error) {
      console.warn('Analytics tracking failed:', error);
    }
  }

  static async getMetrics(talentId: string, filters?: Partial<AnalyticsFilters>): Promise<any> {
    const params = new URLSearchParams({
      talentId,
      compareWith: 'previous'
    });

    if (filters?.dateRange) {
      params.append('startDate', filters.dateRange.startDate.toISOString());
      params.append('endDate', filters.dateRange.endDate.toISOString());
    }

    const response = await fetch(`${this.baseUrl}/metrics?${params}`);
    if (!response.ok) throw new Error('Failed to fetch metrics');

    return response.json();
  }

  static async getRealTimeMetrics(talentId: string): Promise<any> {
    const response = await fetch(`${this.baseUrl}/metrics/realtime`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ talentId })
    });

    if (!response.ok) throw new Error('Failed to fetch real-time metrics');
    return response.json();
  }
}

// Main analytics hook
export function useAnalytics(talentId?: string) {
  const lastEventRef = useRef<{ type: string; timestamp: number } | null>(null);

  // Track analytics event
  const trackEvent = useCallback(async (
    eventType: AnalyticsEventType,
    metadata?: Record<string, any>
  ) => {
    if (!talentId) return;

    // Debounce rapid events (same type within 1 second)
    const now = Date.now();
    if (lastEventRef.current &&
        lastEventRef.current.type === eventType &&
        now - lastEventRef.current.timestamp < 1000) {
      return;
    }

    lastEventRef.current = { type: eventType, timestamp: now };

    const payload: EventTrackingPayload = {
      eventType,
      talentId,
      metadata: {
        ...metadata,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        screenResolution: `${screen.width}x${screen.height}`,
        windowSize: `${window.innerWidth}x${window.innerHeight}`,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
      }
    };

    await AnalyticsAPI.trackEvent(payload);
  }, [talentId]);

  // Convenience methods for common events
  const trackProfileView = useCallback(() => {
    trackEvent('profile_view');
  }, [trackEvent]);

  const trackPortfolioView = useCallback(() => {
    trackEvent('portfolio_view');
  }, [trackEvent]);

  const trackPortfolioItemClick = useCallback((portfolioItemId: string, itemTitle: string) => {
    trackEvent('portfolio_item_click', { portfolioItemId, itemTitle });
  }, [trackEvent]);

  const trackContactInquiry = useCallback(() => {
    trackEvent('contact_inquiry');
  }, [trackEvent]);

  const trackBookingRequest = useCallback() => {
    trackEvent('booking_request');
  }, [trackEvent]);

  const trackSocialShare = useCallback((platform: string, url: string) => {
    trackEvent('social_share', { platform, url });
  }, [trackEvent]);

  const trackDownload = useCallback((itemId: string, itemType: string) => {
    trackEvent('download', { itemId, itemType });
  }, [trackEvent]);

  const trackLike = useCallback((itemId: string) => {
    trackEvent('like', { itemId });
  }, [trackEvent]);

  const trackPortfolioFilter = useCallback((filterType: string, filterValue: string) => {
    trackEvent('portfolio_filter', { filterType, filterValue });
  }, [trackEvent]);

  const trackSearch = useCallback((query: string, results: number) => {
    trackEvent('search', { query, results });
  }, [trackEvent]);

  return {
    trackEvent,
    trackProfileView,
    trackPortfolioView,
    trackPortfolioItemClick,
    trackContactInquiry,
    trackBookingRequest,
    trackSocialShare,
    trackDownload,
    trackLike,
    trackPortfolioFilter,
    trackSearch
  };
}

// Hook for fetching analytics data
export function useAnalyticsData(talentId: string, filters?: Partial<AnalyticsFilters>) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!talentId) return;

    try {
      setLoading(true);
      setError(null);
      const result = await AnalyticsAPI.getMetrics(talentId, filters);
      setData(result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch analytics data');
    } finally {
      setLoading(false);
    }
  }, [talentId, filters]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}

// Hook for real-time analytics
export function useRealTimeAnalytics(talentId: string, intervalMs: number = 30000) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!talentId) return;

    const fetchRealTimeData = async () => {
      try {
        const result = await AnalyticsAPI.getRealTimeMetrics(talentId);
        setData(result.data);
        setLoading(false);
      } catch (error) {
        console.warn('Failed to fetch real-time analytics:', error);
      }
    };

    // Initial fetch
    fetchRealTimeData();

    // Set up interval for real-time updates
    const interval = setInterval(fetchRealTimeData, intervalMs);

    return () => clearInterval(interval);
  }, [talentId, intervalMs]);

  return { data, loading };
}

// Hook for page view tracking
export function usePageTracking(talentId?: string, pageType: 'profile' | 'portfolio' | 'other' = 'other') {
  const analytics = useAnalytics(talentId);
  const hasTracked = useRef(false);

  useEffect(() => {
    if (!talentId || hasTracked.current) return;

    hasTracked.current = true;

    switch (pageType) {
      case 'profile':
        analytics.trackProfileView();
        break;
      case 'portfolio':
        analytics.trackPortfolioView();
        break;
    }

    // Track page exit when component unmounts or page changes
    const handleBeforeUnload = () => {
      analytics.trackEvent('page_exit', {
        pageType,
        timeOnPage: Date.now() - performance.now()
      });
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      handleBeforeUnload(); // Track exit on component unmount
    };
  }, [talentId, pageType, analytics]);
}

// Hook for scroll tracking
export function useScrollTracking(talentId?: string) {
  const analytics = useAnalytics(talentId);
  const scrollDepthRef = useRef(0);

  useEffect(() => {
    if (!talentId) return;

    const handleScroll = () => {
      const scrollTop = window.pageYOffset;
      const documentHeight = document.documentElement.scrollHeight - window.innerHeight;
      const scrollPercentage = Math.round((scrollTop / documentHeight) * 100);

      // Track scroll milestones (25%, 50%, 75%, 100%)
      const milestones = [25, 50, 75, 100];
      const newMilestone = milestones.find(milestone =>
        scrollPercentage >= milestone && scrollDepthRef.current < milestone
      );

      if (newMilestone) {
        scrollDepthRef.current = newMilestone;
        analytics.trackEvent('scroll_depth', {
          percentage: newMilestone,
          scrollTop,
          documentHeight
        });
      }
    };

    const throttledScroll = throttle(handleScroll, 1000); // Throttle to once per second
    window.addEventListener('scroll', throttledScroll);

    return () => window.removeEventListener('scroll', throttledScroll);
  }, [talentId, analytics]);
}

// Utility function for throttling
function throttle(func: Function, limit: number) {
  let inThrottle: boolean;
  return function(this: any, ...args: any[]) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}
