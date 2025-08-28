import { NextRequest, NextResponse } from 'next/server';
import { AnalyticsEvent, AnalyticsEventType, EventTrackingPayload } from '@/lib/types/analytics';
import { AnalyticsService } from '@/lib/services/analytics-service';
import { AnalyticsDatabase } from '@/lib/services/analytics-database';

// Disable static export for this route since it requires real-time functionality
// Dynamic export only for non-static builds
export const dynamic = 'force-dynamic';

// POST /api/analytics/events - Track new analytics event
export async function POST(request: NextRequest) {
  try {
    const body: EventTrackingPayload = await request.json();

    // Validate required fields
    if (!body.eventType || !body.talentId) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: eventType, talentId' },
        { status: 400 }
      );
    }

    // Extract device and location info from request
    const userAgent = request.headers.get('user-agent') || '';
    const forwarded = request.headers.get('x-forwarded-for');
    const ip = forwarded ? forwarded.split(',')[0] : request.ip || '';
    const referer = request.headers.get('referer');

    // Create analytics event
    const event: Omit<AnalyticsEvent, 'id'> = {
      talentId: body.talentId,
      eventType: body.eventType,
      timestamp: new Date(),
      sessionId: body.sessionId || generateSessionId(),
      metadata: body.metadata || {},
      deviceInfo: {
        userAgent,
        deviceType: getDeviceType(userAgent),
        browser: getBrowser(userAgent),
        os: getOS(userAgent),
        screenResolution: 'unknown'
      },
      locationInfo: {
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        // Note: In production, you'd use a geolocation service with the IP
        country: 'Unknown',
        region: 'Unknown',
        city: 'Unknown'
      },
      referrerInfo: {
        source: getReferrerSource(referer),
        referrer: referer || undefined,
        utm_source: extractUTMParam(referer, 'utm_source'),
        utm_medium: extractUTMParam(referer, 'utm_medium'),
        utm_campaign: extractUTMParam(referer, 'utm_campaign')
      }
    };

    // Save event using analytics service
    const savedEvent = await AnalyticsService.trackEvent(event);

    return NextResponse.json({
      success: true,
      data: { eventId: savedEvent.id },
      timestamp: new Date()
    });

  } catch (error) {
    console.error('Analytics event tracking error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to track event' },
      { status: 500 }
    );
  }
}

// GET /api/analytics/events - Retrieve analytics events with filters
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const talentId = searchParams.get('talentId');
    const eventType = searchParams.get('eventType') as AnalyticsEventType;
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const limit = parseInt(searchParams.get('limit') || '100');

    if (!talentId) {
      return NextResponse.json(
        { success: false, error: 'talentId is required' },
        { status: 400 }
      );
    }

    const filters = {
      talentId,
      eventType: eventType || undefined,
      dateRange: startDate && endDate ? {
        startDate: new Date(startDate),
        endDate: new Date(endDate)
      } : {
        startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
        endDate: new Date()
      },
      limit
    };

    const events = await AnalyticsService.getEvents(filters);

    return NextResponse.json({
      success: true,
      data: events,
      timestamp: new Date()
    });

  } catch (error) {
    console.error('Analytics events retrieval error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to retrieve events' },
      { status: 500 }
    );
  }
}

// Helper functions
function generateSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function getDeviceType(userAgent: string): 'mobile' | 'tablet' | 'desktop' {
  const mobile = /Mobile|Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
  const tablet = /iPad|Android(?!.*Mobile)/i.test(userAgent);

  if (tablet) return 'tablet';
  if (mobile) return 'mobile';
  return 'desktop';
}

function getBrowser(userAgent: string): string {
  if (userAgent.includes('Chrome')) return 'Chrome';
  if (userAgent.includes('Firefox')) return 'Firefox';
  if (userAgent.includes('Safari')) return 'Safari';
  if (userAgent.includes('Edge')) return 'Edge';
  return 'Unknown';
}

function getOS(userAgent: string): string {
  if (userAgent.includes('Windows')) return 'Windows';
  if (userAgent.includes('Mac')) return 'macOS';
  if (userAgent.includes('Linux')) return 'Linux';
  if (userAgent.includes('Android')) return 'Android';
  if (userAgent.includes('iOS')) return 'iOS';
  return 'Unknown';
}

function getReferrerSource(referer: string | null): 'direct' | 'social' | 'search' | 'referral' {
  if (!referer) return 'direct';

  const url = new URL(referer);
  const domain = url.hostname.toLowerCase();

  // Social media platforms
  const socialPlatforms = ['facebook.com', 'twitter.com', 'instagram.com', 'linkedin.com', 'tiktok.com'];
  if (socialPlatforms.some(platform => domain.includes(platform))) {
    return 'social';
  }

  // Search engines
  const searchEngines = ['google.com', 'bing.com', 'yahoo.com', 'duckduckgo.com'];
  if (searchEngines.some(engine => domain.includes(engine))) {
    return 'search';
  }

  return 'referral';
}

function extractUTMParam(referer: string | null, param: string): string | undefined {
  if (!referer) return undefined;

  try {
    const url = new URL(referer);
    return url.searchParams.get(param) || undefined;
  } catch {
    return undefined;
  }
}
