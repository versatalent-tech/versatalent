import { NextRequest, NextResponse } from 'next/server';
import { AnalyticsDatabase } from '@/lib/services/analytics-database';

// Disable static export for this route since it requires real-time functionality
export const dynamic = 'force-dynamic';

// GET /api/analytics/realtime/stream - Server-Sent Events stream for real-time updates
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const talentId = searchParams.get('talentId');

  if (!talentId) {
    return NextResponse.json(
      { success: false, error: 'talentId is required' },
      { status: 400 }
    );
  }

  const encoder = new TextEncoder();

  // Create a readable stream for Server-Sent Events
  const stream = new ReadableStream({
    start(controller) {
      // Send initial connection event
      const welcomeEvent = `data: ${JSON.stringify({
        type: 'connection',
        talentId,
        message: 'Real-time analytics connected',
        timestamp: new Date().toISOString()
      })}\n\n`;
      controller.enqueue(encoder.encode(welcomeEvent));

      const db = AnalyticsDatabase.getInstance();

      // Subscribe to real-time updates from the database
      const unsubscribe = db.subscribeToRealtimeUpdates(talentId, (data) => {
        try {
          const eventData = `data: ${JSON.stringify(data)}\n\n`;
          controller.enqueue(encoder.encode(eventData));
        } catch (error) {
          console.error('Error sending SSE event:', error);
        }
      });

      // Send periodic heartbeat and active visitor updates
      const heartbeatInterval = setInterval(async () => {
        try {
          const activeVisitors = await db.getActiveVisitorCount(talentId);

          const heartbeatEvent = `event: active_visitors_changed
data: ${JSON.stringify({
  type: 'active_visitors_changed',
  talentId,
  data: { count: activeVisitors },
  timestamp: new Date().toISOString()
})}

`;
          controller.enqueue(encoder.encode(heartbeatEvent));
        } catch (error) {
          console.error('Error sending heartbeat:', error);
        }
      }, 30000); // Every 30 seconds

      // Send live metrics update every 2 minutes
      const metricsInterval = setInterval(async () => {
        try {
          const now = new Date();
          const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

          const recentEvents = await db.getEvents({
            talentIds: [talentId],
            dateRange: { startDate: oneHourAgo, endDate: now },
            limit: 50
          });

          const liveMetrics = {
            profileViews: recentEvents.filter(e => e.eventType === 'profile_view').length,
            portfolioViews: recentEvents.filter(e => e.eventType === 'portfolio_view').length,
            inquiries: recentEvents.filter(e => e.eventType === 'contact_inquiry').length,
            engagement: recentEvents.filter(e => ['like', 'social_share', 'download'].includes(e.eventType)).length,
            uniqueVisitors: new Set(recentEvents.map(e => e.sessionId)).size
          };

          const metricsEvent = `event: metrics_updated
data: ${JSON.stringify({
  type: 'metrics_updated',
  talentId,
  data: {
    metrics: liveMetrics,
    timeframe: 'last_hour'
  },
  timestamp: new Date().toISOString()
})}

`;
          controller.enqueue(encoder.encode(metricsEvent));
        } catch (error) {
          console.error('Error sending metrics update:', error);
        }
      }, 120000); // Every 2 minutes

      // Clean up when connection closes
      const cleanup = () => {
        clearInterval(heartbeatInterval);
        clearInterval(metricsInterval);
        unsubscribe();
      };

      // Store cleanup function for later use
      request.signal.addEventListener('abort', cleanup);

      // Set up connection close handler
      controller.enqueue(encoder.encode(`event: connected
data: ${JSON.stringify({
  type: 'connected',
  talentId,
  timestamp: new Date().toISOString()
})}

`));
    },

    cancel() {
      // Cleanup when stream is cancelled
      console.log(`Real-time stream cancelled for talent: ${talentId}`);
    }
  });

  // Return response with SSE headers
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control',
      'Access-Control-Allow-Methods': 'GET',
      'X-Accel-Buffering': 'no' // Disable nginx buffering
    }
  });
}

// Handle preflight requests for CORS
export async function OPTIONS(request: NextRequest) {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Cache-Control',
    },
  });
}
