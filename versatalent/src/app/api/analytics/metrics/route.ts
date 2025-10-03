import { NextRequest, NextResponse } from 'next/server';
import { AnalyticsService } from '@/lib/services/analytics-service';
import { AnalyticsFilters } from '@/lib/types/analytics';

// GET /api/analytics/metrics - Get aggregated analytics metrics
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const talentId = searchParams.get('talentId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const compareWith = searchParams.get('compareWith'); // previous period comparison

    if (!talentId) {
      return NextResponse.json(
        { success: false, error: 'talentId is required' },
        { status: 400 }
      );
    }

    // Set default date range (last 30 days)
    const defaultEndDate = new Date();
    const defaultStartDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const filters: AnalyticsFilters = {
      dateRange: {
        startDate: startDate ? new Date(startDate) : defaultStartDate,
        endDate: endDate ? new Date(endDate) : defaultEndDate
      },
      talentIds: [talentId]
    };

    // Get analytics metrics
    const metrics = await AnalyticsService.getMetrics(filters);

    // Get comparison data if requested
    let comparison = null;
    if (compareWith === 'previous') {
      const periodLength = filters.dateRange.endDate.getTime() - filters.dateRange.startDate.getTime();
      const comparisonFilters: AnalyticsFilters = {
        dateRange: {
          startDate: new Date(filters.dateRange.startDate.getTime() - periodLength),
          endDate: filters.dateRange.startDate
        },
        talentIds: [talentId]
      };
      comparison = await AnalyticsService.getMetrics(comparisonFilters);
    }

    return NextResponse.json({
      success: true,
      data: {
        current: metrics,
        comparison: comparison,
        trends: comparison ? AnalyticsService.calculateTrends(metrics, comparison) : null
      },
      timestamp: new Date(),
      cached: false
    });

  } catch (error) {
    console.error('Analytics metrics retrieval error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to retrieve analytics metrics' },
      { status: 500 }
    );
  }
}

// GET /api/analytics/metrics/realtime - Get real-time analytics data
export async function POST(request: NextRequest) {
  try {
    const { talentId } = await request.json();

    if (!talentId) {
      return NextResponse.json(
        { success: false, error: 'talentId is required' },
        { status: 400 }
      );
    }

    const realTimeData = await AnalyticsService.getRealTimeMetrics(talentId);

    return NextResponse.json({
      success: true,
      data: realTimeData,
      timestamp: new Date()
    });

  } catch (error) {
    console.error('Real-time analytics error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to retrieve real-time metrics' },
      { status: 500 }
    );
  }
}
