"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  useRealtimeAnalytics,
  usePerformanceMonitor,
  useVisitorTracking
} from '@/lib/services/realtime-analytics';
import {
  Activity,
  Users,
  Eye,
  MessageSquare,
  Calendar,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Clock,
  Globe,
  Smartphone,
  Monitor,
  Tablet
} from 'lucide-react';

interface RealtimeAnalyticsDashboardProps {
  talentId: string;
}

export function RealtimeAnalyticsDashboard({ talentId }: RealtimeAnalyticsDashboardProps) {
  const {
    connectionStatus,
    realtimeData,
    lastEvent,
    isLoading,
    isConnected
  } = useRealtimeAnalytics(talentId);

  const { alerts } = usePerformanceMonitor(talentId);
  const { activeVisitors, recentVisitors } = useVisitorTracking(talentId);

  const [selectedTimeframe, setSelectedTimeframe] = useState<'1h' | '6h' | '24h'>('1h');

  return (
    <div className="space-y-6">
      {/* Connection Status */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Real-time Analytics</CardTitle>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${
                isConnected ? 'bg-green-500' : 'bg-red-500'
              }`} />
              <span className="text-sm text-gray-600">
                {connectionStatus === 'connected' ? 'Live' :
                 connectionStatus === 'connecting' ? 'Connecting...' :
                 'Disconnected'}
              </span>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Real-time Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Active Visitors"
          value={activeVisitors}
          icon={<Users className="h-4 w-4" />}
          trend="live"
          color="green"
        />
        <MetricCard
          title="Views Today"
          value={realtimeData?.todayMetrics?.profileViews || 0}
          icon={<Eye className="h-4 w-4" />}
          trend={realtimeData?.todayMetrics?.profileViews > 100 ? '+15%' : '+8%'}
          color="blue"
        />
        <MetricCard
          title="Inquiries Today"
          value={realtimeData?.todayMetrics?.inquiries || 0}
          icon={<MessageSquare className="h-4 w-4" />}
          trend={realtimeData?.todayMetrics?.inquiries > 5 ? '+12%' : '+3%'}
          color="purple"
        />
        <MetricCard
          title="Engagement Rate"
          value={`${realtimeData?.todayMetrics ?
            Math.round((realtimeData.todayMetrics.likes + realtimeData.todayMetrics.socialShares) /
            Math.max(realtimeData.todayMetrics.profileViews, 1) * 100) : 0}%`}
          icon={<TrendingUp className="h-4 w-4" />}
          trend="+5%"
          color="orange"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Live Activity Feed */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Live Activity
            </CardTitle>
            <CardDescription>Real-time user interactions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {realtimeData?.liveActivity?.slice(0, 10).map((activity, index) => (
                <LiveActivityItem key={index} activity={activity} />
              )) || (
                <div className="text-center text-gray-500 py-4">
                  <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>Waiting for activity...</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent Visitors */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              Recent Visitors
            </CardTitle>
            <CardDescription>Latest visitor information</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {recentVisitors.slice(0, 8).map((visitor, index) => (
                <RecentVisitorItem key={index} visitor={visitor} />
              ))}
              {recentVisitors.length === 0 && (
                <div className="text-center text-gray-500 py-4">
                  <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No recent visitors</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Performance Alerts */}
      {alerts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Performance Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {alerts.map((alert, index) => (
                <PerformanceAlert key={index} alert={alert} />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Advanced Real-time Tabs */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="traffic">Traffic Sources</TabsTrigger>
          <TabsTrigger value="devices">Devices</TabsTrigger>
          <TabsTrigger value="geography">Geography</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <RealtimeOverview realtimeData={realtimeData} />
        </TabsContent>

        <TabsContent value="traffic" className="space-y-4">
          <TrafficSources realtimeData={realtimeData} />
        </TabsContent>

        <TabsContent value="devices" className="space-y-4">
          <DeviceBreakdown realtimeData={realtimeData} />
        </TabsContent>

        <TabsContent value="geography" className="space-y-4">
          <GeographyView realtimeData={realtimeData} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Individual Components

function MetricCard({ title, value, icon, trend, color }: {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  trend?: string;
  color: 'green' | 'blue' | 'purple' | 'orange';
}) {
  const colorClasses = {
    green: 'text-green-600 bg-green-50',
    blue: 'text-blue-600 bg-blue-50',
    purple: 'text-purple-600 bg-purple-50',
    orange: 'text-orange-600 bg-orange-50'
  };

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className={`p-2 rounded-lg ${colorClasses[color]}`}>
            {icon}
          </div>
          {trend && (
            <Badge variant={trend === 'live' ? 'default' : 'secondary'} className="text-xs">
              {trend === 'live' ? 'LIVE' : trend}
            </Badge>
          )}
        </div>
        <div className="mt-3">
          <div className="text-2xl font-bold">{value}</div>
          <div className="text-sm text-gray-600">{title}</div>
        </div>
      </CardContent>
    </Card>
  );
}

function LiveActivityItem({ activity }: { activity: Record<string, unknown> }) {
  const getEventIcon = (type: string) => {
    switch (type) {
      case 'profile_view': return <Eye className="h-4 w-4" />;
      case 'portfolio_view': return <Activity className="h-4 w-4" />;
      case 'contact_inquiry': return <MessageSquare className="h-4 w-4" />;
      case 'booking_request': return <Calendar className="h-4 w-4" />;
      default: return <Activity className="h-4 w-4" />;
    }
  };

  const getEventText = (type: string) => {
    switch (type) {
      case 'profile_view': return 'viewed profile';
      case 'portfolio_view': return 'viewed portfolio';
      case 'contact_inquiry': return 'sent inquiry';
      case 'booking_request': return 'requested booking';
      case 'social_share': return 'shared content';
      case 'like': return 'liked content';
      case 'download': return 'downloaded content';
      default: return 'performed action';
    }
  };

  return (
    <div className="flex items-center gap-3 p-2 rounded-lg bg-gray-50">
      <div className="text-gray-600">
        {getEventIcon(activity.type)}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm">
          User from <span className="font-medium">{activity.location}</span> {getEventText(activity.type)}
        </p>
        <p className="text-xs text-gray-500">
          {new Date(activity.timestamp).toLocaleTimeString()} • {activity.device}
        </p>
      </div>
    </div>
  );
}

function RecentVisitorItem({ visitor }: { visitor: Record<string, unknown> }) {
  const getDeviceIcon = (device: string) => {
    switch (device) {
      case 'mobile': return <Smartphone className="h-4 w-4" />;
      case 'tablet': return <Tablet className="h-4 w-4" />;
      case 'desktop': return <Monitor className="h-4 w-4" />;
      default: return <Monitor className="h-4 w-4" />;
    }
  };

  return (
    <div className="flex items-center justify-between p-2 rounded-lg border">
      <div className="flex items-center gap-3">
        <div className="text-gray-600">
          {getDeviceIcon(visitor.device)}
        </div>
        <div>
          <p className="text-sm font-medium">{visitor.location}</p>
          <p className="text-xs text-gray-500">
            {new Date(visitor.timestamp).toLocaleTimeString()}
          </p>
        </div>
      </div>
      <Badge variant="outline" className="text-xs">
        {visitor.device}
      </Badge>
    </div>
  );
}

function PerformanceAlert({ alert }: { alert: Record<string, unknown> }) {
  const isSuccess = alert.type === 'success';

  return (
    <div className={`flex items-center gap-3 p-3 rounded-lg ${
      isSuccess ? 'bg-green-50 text-green-800' : 'bg-yellow-50 text-yellow-800'
    }`}>
      {isSuccess ? (
        <CheckCircle className="h-5 w-5" />
      ) : (
        <AlertTriangle className="h-5 w-5" />
      )}
      <div className="flex-1">
        <p className="text-sm font-medium">{alert.message}</p>
        <p className="text-xs opacity-75">
          {new Date(alert.timestamp).toLocaleString()}
        </p>
      </div>
    </div>
  );
}

function RealtimeOverview({ realtimeData }: { realtimeData: Record<string, unknown> | null }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Performance Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span>Response Time</span>
              <span className="font-mono">{realtimeData?.performanceIndicators?.responseTime || '--'}ms</span>
            </div>
            <div className="flex justify-between">
              <span>Error Rate</span>
              <span className="font-mono">{((realtimeData?.performanceIndicators?.errorRate || 0) * 100).toFixed(2)}%</span>
            </div>
            <div className="flex justify-between">
              <span>Uptime</span>
              <span className="font-mono">{(realtimeData?.performanceIndicators?.uptime || 0).toFixed(1)}%</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Today's Highlights</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span>Total Views</span>
              <span className="font-semibold">{realtimeData?.todayMetrics?.profileViews || 0}</span>
            </div>
            <div className="flex justify-between">
              <span>Unique Visitors</span>
              <span className="font-semibold">{realtimeData?.todayMetrics?.uniqueVisitors || 0}</span>
            </div>
            <div className="flex justify-between">
              <span>Engagements</span>
              <span className="font-semibold">
                {(realtimeData?.todayMetrics?.likes || 0) + (realtimeData?.todayMetrics?.socialShares || 0)}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function TrafficSources({ realtimeData }: { realtimeData: Record<string, unknown> | null }) {
  // Mock traffic source data - in production, this would come from real-time data
  const sources = [
    { name: 'Direct', value: 45, color: 'bg-blue-500' },
    { name: 'Social Media', value: 30, color: 'bg-green-500' },
    { name: 'Search', value: 20, color: 'bg-purple-500' },
    { name: 'Referral', value: 5, color: 'bg-orange-500' }
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Real-time Traffic Sources</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {sources.map((source) => (
            <div key={source.name} className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${source.color}`} />
              <span className="flex-1">{source.name}</span>
              <span className="font-semibold">{source.value}%</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function DeviceBreakdown({ realtimeData }: { realtimeData: Record<string, unknown> | null }) {
  // Mock device data - in production, this would come from real-time data
  const devices = [
    { name: 'Desktop', value: 55, icon: <Monitor className="h-4 w-4" /> },
    { name: 'Mobile', value: 35, icon: <Smartphone className="h-4 w-4" /> },
    { name: 'Tablet', value: 10, icon: <Tablet className="h-4 w-4" /> }
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Device Breakdown</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {devices.map((device) => (
            <div key={device.name} className="flex items-center gap-3">
              <div className="text-gray-600">{device.icon}</div>
              <span className="flex-1">{device.name}</span>
              <div className="flex items-center gap-2">
                <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500"
                    style={{ width: `${device.value}%` }}
                  />
                </div>
                <span className="font-semibold text-sm">{device.value}%</span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function GeographyView({ realtimeData }: { realtimeData: Record<string, unknown> | null }) {
  // Mock geography data - in production, this would come from real-time data
  const countries = [
    { name: 'United States', value: 35 },
    { name: 'United Kingdom', value: 20 },
    { name: 'Germany', value: 15 },
    { name: 'France', value: 12 },
    { name: 'Canada', value: 10 },
    { name: 'Others', value: 8 }
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Geographic Distribution</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {countries.map((country) => (
            <div key={country.name} className="flex items-center justify-between">
              <span>{country.name}</span>
              <div className="flex items-center gap-2">
                <div className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-500"
                    style={{ width: `${country.value}%` }}
                  />
                </div>
                <span className="font-semibold text-sm w-8">{country.value}%</span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
