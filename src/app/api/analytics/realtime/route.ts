import { NextRequest, NextResponse } from 'next/server';
import { AnalyticsDatabase } from '@/lib/services/analytics-database';

// Disable static export for this route since it requires real-time functionality
export const dynamic = 'force-dynamic';

// GET /api/analytics/realtime - Get current real-time analytics data
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const talentId = searchParams.get('talentId');

    if (!talentId) {
      return NextResponse.json(
        { success: false, error: 'talentId is required' },
        { status: 400 }
      );
    }

    const db = AnalyticsDatabase.getInstance();

    // Get current active visitors
    const activeVisitors = await db.getActiveVisitorCount(talentId);

    // Get recent events (last hour)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentEvents = await db.getEvents({
      talentIds: [talentId],
      dateRange: { startDate: oneHourAgo, endDate: new Date() },
      limit: 10
    });

    // Get today's metrics
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todayEvents = await db.getEvents({
      talentIds: [talentId],
      dateRange: { startDate: today, endDate: tomorrow }
    });

    const todayMetrics = {
      profileViews: todayEvents.filter(e => e.eventType === 'profile_view').length,
      portfolioViews: todayEvents.filter(e => e.eventType === 'portfolio_view').length,
      inquiries: todayEvents.filter(e => e.eventType === 'contact_inquiry').length,
      bookings: todayEvents.filter(e => e.eventType === 'booking_request').length,
      socialShares: todayEvents.filter(e => e.eventType === 'social_share').length,
      downloads: todayEvents.filter(e => e.eventType === 'download').length,
      likes: todayEvents.filter(e => e.eventType === 'like').length,
      uniqueVisitors: new Set(todayEvents.map(e => e.sessionId)).size
    };

    // Get live activity for the last 5 minutes
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const liveActivity = await db.getEvents({
      talentIds: [talentId],
      dateRange: { startDate: fiveMinutesAgo, endDate: new Date() },
      limit: 20
    });

    const realtimeData = {
      talentId,
      lastUpdated: new Date().toISOString(),
      activeVisitors,
      recentEvents: recentEvents.slice(0, 5),
      todayMetrics,
      liveActivity: liveActivity.map(event => ({
        id: event.id,
        type: event.eventType,
        timestamp: event.timestamp,
        location: event.locationInfo.country,
        device: event.deviceInfo.deviceType,
        metadata: event.metadata
      })),
      performanceIndicators: {
        responseTime: Math.floor(Math.random() * 500) + 100, // Mock response time
        errorRate: Math.random() * 0.1, // Mock error rate
        uptime: 99.9 + Math.random() * 0.1 // Mock uptime
      }
    };

    return NextResponse.json({
      success: true,
      data: realtimeData,
      timestamp: new Date()
    });

  } catch (error) {
    console.error('Real-time analytics error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to retrieve real-time analytics' },
      { status: 500 }
    );
  }
}
