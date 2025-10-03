"use client";

import { useState, useMemo, useEffect } from "react";
import { motion } from "framer-motion";
import { useAnalyticsData, useRealTimeAnalytics } from "@/lib/hooks/useAnalytics";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LabelList
} from "recharts";
import {
  TrendingUp,
  TrendingDown,
  Eye,
  Heart,
  Share2,
  Download,
  MessageCircle,
  Users,
  Globe,
  Smartphone,
  Monitor,
  Clock,
  Target,
  DollarSign,
  Award,
  Filter,
  Calendar,
  FileDown,
  Activity,
  Zap,
  BarChart3
} from "lucide-react";
import { RealtimeAnalyticsDashboard } from './RealtimeAnalyticsDashboard';

interface AnalyticsDashboardProps {
  talentId: string;
  talentName: string;
}

// Transform API data to chart format
const transformApiDataToChartData = (analyticsData: any, realTimeData: any) => {
  const current = analyticsData.current;
  const trends = analyticsData.trends || {};

  return {
    timeSeriesData: current.timeSeries || [],
    funnelData: [
      { name: 'Profile Views', value: current.metrics.profileViews, fill: '#8884d8' },
      { name: 'Portfolio Clicks', value: Math.floor(current.metrics.profileViews * 0.65), fill: '#82ca9d' },
      { name: 'Contact Inquiries', value: current.metrics.inquiries, fill: '#ffc658' },
      { name: 'Bookings', value: current.metrics.bookings, fill: '#D4AF37' }
    ],
    demographicsData: current.demographics?.ageGroups || [
      { name: '18-24', value: 15, fill: '#8884d8' },
      { name: '25-34', value: 35, fill: '#82ca9d' },
      { name: '35-44', value: 28, fill: '#ffc658' },
      { name: '45-54', value: 15, fill: '#ff7300' },
      { name: '55+', value: 7, fill: '#D4AF37' }
    ],
    deviceData: current.demographics?.deviceTypes?.map((device: any) => ({
      name: device.device.charAt(0).toUpperCase() + device.device.slice(1),
      value: device.percentage,
      fill: device.device === 'mobile' ? '#8884d8' : device.device === 'desktop' ? '#82ca9d' : '#ffc658'
    })) || [
      { name: 'Mobile', value: 65, fill: '#8884d8' },
      { name: 'Desktop', value: 28, fill: '#82ca9d' },
      { name: 'Tablet', value: 7, fill: '#ffc658' }
    ],
    geoData: current.demographics?.topCountries || [
      { country: 'United Kingdom', views: Math.floor(current.metrics.profileViews * 0.4), percentage: 40 },
      { country: 'United States', views: Math.floor(current.metrics.profileViews * 0.25), percentage: 25 },
      { country: 'Germany', views: Math.floor(current.metrics.profileViews * 0.12), percentage: 12 },
      { country: 'France', views: Math.floor(current.metrics.profileViews * 0.1), percentage: 10 },
      { country: 'Others', views: Math.floor(current.metrics.profileViews * 0.13), percentage: 13 }
    ],
    popularContent: current.contentPerformance || [
      { title: 'Summer Campaign 2024', views: Math.floor(current.metrics.profileViews * 0.2), engagement: 89, type: 'Image' },
      { title: 'Behind the Scenes Video', views: Math.floor(current.metrics.profileViews * 0.18), engagement: 94, type: 'Video' }
    ],
    trafficSources: current.trafficSources?.sources?.map((source: any) => ({
      source: source.source.charAt(0).toUpperCase() + source.source.slice(1),
      visits: source.visits,
      percentage: source.percentage
    })) || [
      { source: 'Direct', visits: Math.floor(current.metrics.profileViews * 0.35), percentage: 35 },
      { source: 'Social Media', visits: Math.floor(current.metrics.profileViews * 0.28), percentage: 28 },
      { source: 'Search Engines', visits: Math.floor(current.metrics.profileViews * 0.22), percentage: 22 },
      { source: 'Referrals', visits: Math.floor(current.metrics.profileViews * 0.15), percentage: 15 }
    ],
    totals: {
      profileViews: current.metrics.profileViews,
      portfolioViews: current.metrics.portfolioViews,
      inquiries: current.metrics.inquiries,
      bookings: current.metrics.bookings,
      revenue: current.metrics.bookings * 250, // $250 avg booking
      conversionRate: current.metrics.conversionRate
    },
    trends: {
      profileViewsChange: trends.profileViewsChange || 0,
      inquiriesChange: trends.inquiriesChange || 0,
      bookingsChange: trends.bookingsChange || 0,
      conversionRateChange: trends.conversionRateChange || 0
    },
    realTime: realTimeData || {
      activeVisitors: 0,
      viewsToday: 0,
      inquiriesToday: 0
    }
  };
};

// Mock data generation (fallback)
const generateMockData = (talentId: string) => {
  const baseViews = parseInt(talentId) * 300 + 1000;

  // Time series data for last 30 days
  const timeSeriesData = Array.from({ length: 30 }, (_, i) => ({
    date: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    profileViews: Math.floor(baseViews * 0.03 + Math.random() * baseViews * 0.02),
    portfolioViews: Math.floor(baseViews * 0.05 + Math.random() * baseViews * 0.03),
    inquiries: Math.floor(baseViews * 0.002 + Math.random() * baseViews * 0.001),
    bookings: Math.floor(baseViews * 0.0005 + Math.random() * baseViews * 0.0003),
    engagement: Math.floor(baseViews * 0.08 + Math.random() * baseViews * 0.04)
  }));

  // Conversion funnel data
  const funnelData = [
    { name: 'Profile Views', value: baseViews, fill: '#8884d8' },
    { name: 'Portfolio Clicks', value: Math.floor(baseViews * 0.65), fill: '#82ca9d' },
    { name: 'Contact Inquiries', value: Math.floor(baseViews * 0.08), fill: '#ffc658' },
    { name: 'Bookings', value: Math.floor(baseViews * 0.015), fill: '#D4AF37' }
  ];

  // Audience demographics
  const demographicsData = [
    { name: '18-24', value: 15, fill: '#8884d8' },
    { name: '25-34', value: 35, fill: '#82ca9d' },
    { name: '35-44', value: 28, fill: '#ffc658' },
    { name: '45-54', value: 15, fill: '#ff7300' },
    { name: '55+', value: 7, fill: '#D4AF37' }
  ];

  // Device usage
  const deviceData = [
    { name: 'Mobile', value: 65, fill: '#8884d8' },
    { name: 'Desktop', value: 28, fill: '#82ca9d' },
    { name: 'Tablet', value: 7, fill: '#ffc658' }
  ];

  // Geographic data
  const geoData = [
    { country: 'United Kingdom', views: Math.floor(baseViews * 0.4), percentage: 40 },
    { country: 'United States', views: Math.floor(baseViews * 0.25), percentage: 25 },
    { country: 'Germany', views: Math.floor(baseViews * 0.12), percentage: 12 },
    { country: 'France', views: Math.floor(baseViews * 0.1), percentage: 10 },
    { country: 'Others', views: Math.floor(baseViews * 0.13), percentage: 13 }
  ];

  // Popular content
  const popularContent = [
    { title: 'Summer Campaign 2024', views: Math.floor(baseViews * 0.2), engagement: 89, type: 'Image' },
    { title: 'Behind the Scenes Video', views: Math.floor(baseViews * 0.18), engagement: 94, type: 'Video' },
    { title: 'Professional Headshots', views: Math.floor(baseViews * 0.15), engagement: 76, type: 'Image' },
    { title: 'Live Performance', views: Math.floor(baseViews * 0.12), engagement: 82, type: 'Video' },
    { title: 'Editorial Shoot', views: Math.floor(baseViews * 0.1), engagement: 68, type: 'Image' }
  ];

  // Traffic sources
  const trafficSources = [
    { source: 'Direct', visits: Math.floor(baseViews * 0.35), percentage: 35 },
    { source: 'Social Media', visits: Math.floor(baseViews * 0.28), percentage: 28 },
    { source: 'Search Engines', visits: Math.floor(baseViews * 0.22), percentage: 22 },
    { source: 'Referrals', visits: Math.floor(baseViews * 0.15), percentage: 15 }
  ];

  return {
    timeSeriesData,
    funnelData,
    demographicsData,
    deviceData,
    geoData,
    popularContent,
    trafficSources,
    totals: {
      profileViews: baseViews,
      portfolioViews: Math.floor(baseViews * 1.2),
      inquiries: Math.floor(baseViews * 0.08),
      bookings: Math.floor(baseViews * 0.015),
      revenue: Math.floor(baseViews * 0.015 * 250), // $250 avg booking
      conversionRate: ((baseViews * 0.015) / baseViews * 100).toFixed(2)
    }
  };
};

export function AnalyticsDashboard({ talentId, talentName }: AnalyticsDashboardProps) {
  const [timeRange, setTimeRange] = useState('30d');
  const [activeMetric, setActiveMetric] = useState('profileViews');
  const [viewMode, setViewMode] = useState<'regular' | 'realtime'>('regular');

  // Calculate date range based on selection
  const dateRange = useMemo(() => {
    const endDate = new Date();
    const startDate = new Date();

    switch (timeRange) {
      case '7d':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case '90d':
        startDate.setDate(startDate.getDate() - 90);
        break;
      case '1y':
        startDate.setFullYear(startDate.getFullYear() - 1);
        break;
      default: // 30d
        startDate.setDate(startDate.getDate() - 30);
    }

    return { startDate, endDate };
  }, [timeRange]);

  // Fetch real analytics data
  const { data: analyticsData, loading, error, refetch } = useAnalyticsData(talentId, { dateRange });
  const { data: realTimeData } = useRealTimeAnalytics(talentId, 30000); // Update every 30 seconds

  // Use real data or fallback to mock data for demo
  const data = useMemo(() => {
    if (analyticsData?.current) {
      return transformApiDataToChartData(analyticsData, realTimeData);
    }
    // Fallback to mock data for demo purposes
    return generateMockData(talentId);
  }, [analyticsData, realTimeData, talentId]);

  // Show loading state
  if (loading && !data) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold"></div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Failed to load analytics</h3>
        <p className="text-gray-600 mb-4">{error}</p>
        <button
          onClick={refetch}
          className="px-4 py-2 bg-gold text-white rounded-md hover:bg-gold-80"
        >
          Retry
        </button>
      </div>
    );
  }

  const MetricCard = ({ title, value, trend, icon: Icon, color }: {
    title: string;
    value: string;
    trend: number;
    icon: React.ElementType;
    color: string;
  }) => (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">{title}</p>
            <p className="text-2xl font-bold text-gray-900">{value}</p>
            <div className="flex items-center mt-1">
              {trend > 0 ? (
                <TrendingUp className="h-4 w-4 text-green-600 mr-1" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-600 mr-1" />
              )}
              <span className={`text-sm ${trend > 0 ? 'text-green-600' : 'text-red-600'}`}>
                {Math.abs(trend)}% vs last period
              </span>
            </div>
          </div>
          <Icon className={`h-8 w-8 ${color}`} />
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h1>
          <p className="text-gray-600">Comprehensive insights for {talentName}</p>
        </div>
        <div className="flex items-center space-x-2">
          {/* View Mode Switcher */}
          <div className="flex items-center bg-gray-100 rounded-lg p-1">
            <Button
              variant={viewMode === 'regular' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('regular')}
              className="flex items-center gap-2"
            >
              <BarChart3 className="h-4 w-4" />
              Historical
            </Button>
            <Button
              variant={viewMode === 'realtime' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('realtime')}
              className="flex items-center gap-2"
            >
              <Activity className="h-4 w-4" />
              Real-time
            </Button>
          </div>

          {viewMode === 'regular' && (
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
                <SelectItem value="90d">Last 3 months</SelectItem>
                <SelectItem value="1y">Last year</SelectItem>
              </SelectContent>
            </Select>
          )}

          <Button variant="outline" size="sm">
            <FileDown className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Dashboard Content - Conditional Rendering */}
      {viewMode === 'realtime' ? (
        <RealtimeAnalyticsDashboard talentId={talentId} />
      ) : (
        <>
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <MetricCard
              title="Profile Views"
              value={data.totals.profileViews.toLocaleString()}
              trend={12.5}
              icon={Eye}
              color="text-blue-600"
            />
            <MetricCard
              title="Inquiries"
              value={data.totals.inquiries.toLocaleString()}
              trend={8.3}
              icon={MessageCircle}
              color="text-green-600"
            />
            <MetricCard
              title="Bookings"
              value={data.totals.bookings.toLocaleString()}
              trend={15.7}
              icon={Award}
              color="text-gold"
            />
            <MetricCard
              title="Revenue"
              value={`${data.totals.revenue.toLocaleString()}`}
              trend={22.1}
              icon={DollarSign}
              color="text-purple-600"
            />
          </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="conversions">Conversions</TabsTrigger>
          <TabsTrigger value="audience">Audience</TabsTrigger>
          <TabsTrigger value="content">Content</TabsTrigger>
          <TabsTrigger value="traffic">Traffic</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Performance Trends */}
          <Card>
            <CardHeader>
              <CardTitle>Performance Trends</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data.timeSeriesData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="profileViews" stroke="#8884d8" name="Profile Views" />
                    <Line type="monotone" dataKey="portfolioViews" stroke="#82ca9d" name="Portfolio Views" />
                    <Line type="monotone" dataKey="inquiries" stroke="#ffc658" name="Inquiries" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Engagement Overview */}
          <Card>
            <CardHeader>
              <CardTitle>Engagement Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <Heart className="h-8 w-8 text-red-500 mx-auto mb-2" />
                  <p className="text-2xl font-bold">1.2K</p>
                  <p className="text-sm text-gray-600">Likes</p>
                </div>
                <div className="text-center">
                  <Share2 className="h-8 w-8 text-blue-500 mx-auto mb-2" />
                  <p className="text-2xl font-bold">347</p>
                  <p className="text-sm text-gray-600">Shares</p>
                </div>
                <div className="text-center">
                  <Download className="h-8 w-8 text-green-500 mx-auto mb-2" />
                  <p className="text-2xl font-bold">89</p>
                  <p className="text-sm text-gray-600">Downloads</p>
                </div>
                <div className="text-center">
                  <Clock className="h-8 w-8 text-purple-500 mx-auto mb-2" />
                  <p className="text-2xl font-bold">3:24</p>
                  <p className="text-sm text-gray-600">Avg. Time</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="conversions" className="space-y-6">
          {/* Conversion Funnel */}
          <Card>
            <CardHeader>
              <CardTitle>Conversion Funnel</CardTitle>
              <p className="text-sm text-gray-600">Track the journey from profile view to booking</p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.funnelData} layout="horizontal">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis dataKey="name" type="category" />
                      <Tooltip />
                      <Bar dataKey="value" fill="#D4AF37" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-4">
                  {data.funnelData.map((item, index) => (
                    <div key={item.name} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center">
                        <div
                          className="w-3 h-3 rounded-full mr-3"
                          style={{ backgroundColor: item.fill }}
                        />
                        <span className="font-medium">{item.name}</span>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">{item.value.toLocaleString()}</p>
                        {index > 0 && (
                          <p className="text-sm text-gray-600">
                            {((item.value / data.funnelData[index - 1].value) * 100).toFixed(1)}% conversion
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Goal Tracking */}
          <Card>
            <CardHeader>
              <CardTitle>Goal Tracking</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between mb-2">
                    <span>Monthly Bookings Goal</span>
                    <span className="font-bold">12 / 20</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-gold h-2 rounded-full" style={{ width: '60%' }}></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between mb-2">
                    <span>Revenue Goal</span>
                    <span className="font-bold">$3,250 / $5,000</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-green-500 h-2 rounded-full" style={{ width: '65%' }}></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between mb-2">
                    <span>Profile Views Goal</span>
                    <span className="font-bold">1,234 / 1,500</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-blue-500 h-2 rounded-full" style={{ width: '82%' }}></div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="audience" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Demographics */}
            <Card>
              <CardHeader>
                <CardTitle>Age Demographics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={data.demographicsData}
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                        label={({ name, value }) => `${name}: ${value}%`}
                      >
                        {data.demographicsData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Device Usage */}
            <Card>
              <CardHeader>
                <CardTitle>Device Usage</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={data.deviceData}
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                        label={({ name, value }) => `${name}: ${value}%`}
                      >
                        {data.deviceData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Geographic Data */}
          <Card>
            <CardHeader>
              <CardTitle>Geographic Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {data.geoData.map((country) => (
                  <div key={country.country} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Globe className="h-4 w-4 text-gray-400" />
                      <span>{country.country}</span>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="w-24 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-gold h-2 rounded-full"
                          style={{ width: `${country.percentage}%` }}
                        ></div>
                      </div>
                      <span className="text-sm font-medium w-16 text-right">
                        {country.views.toLocaleString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="content" className="space-y-6">
          {/* Popular Content */}
          <Card>
            <CardHeader>
              <CardTitle>Most Popular Content</CardTitle>
              <p className="text-sm text-gray-600">Your top performing portfolio items</p>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {data.popularContent.map((content, index) => (
                  <div key={content.title} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                    <div className="flex items-center space-x-4">
                      <span className="text-2xl font-bold text-gray-400">#{index + 1}</span>
                      <div>
                        <h3 className="font-medium">{content.title}</h3>
                        <div className="flex items-center space-x-2 mt-1">
                          <Badge variant="outline" className="text-xs">
                            {content.type}
                          </Badge>
                          <span className="text-sm text-gray-600">
                            {content.views.toLocaleString()} views
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">Engagement</p>
                      <div className="flex items-center space-x-2">
                        <div className="w-16 bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-green-500 h-2 rounded-full"
                            style={{ width: `${content.engagement}%` }}
                          ></div>
                        </div>
                        <span className="text-sm font-bold">{content.engagement}%</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Content Performance */}
          <Card>
            <CardHeader>
              <CardTitle>Content Performance Over Time</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data.timeSeriesData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Area
                      type="monotone"
                      dataKey="engagement"
                      stackId="1"
                      stroke="#D4AF37"
                      fill="#D4AF37"
                      fillOpacity={0.6}
                      name="Engagement"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="traffic" className="space-y-6">
          {/* Traffic Sources */}
          <Card>
            <CardHeader>
              <CardTitle>Traffic Sources</CardTitle>
              <p className="text-sm text-gray-600">Where your visitors are coming from</p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.trafficSources}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="source" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="visits" fill="#D4AF37" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-4">
                  {data.trafficSources.map((source) => (
                    <div key={source.source} className="flex items-center justify-between">
                      <span className="font-medium">{source.source}</span>
                      <div className="flex items-center space-x-4">
                        <div className="w-24 bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-gold h-2 rounded-full"
                            style={{ width: `${source.percentage}%` }}
                          ></div>
                        </div>
                        <span className="text-sm font-medium w-16 text-right">
                          {source.visits.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Referral Analysis */}
          <Card>
            <CardHeader>
              <CardTitle>Top Referrals</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[
                  { site: 'Instagram', visits: 856, growth: 12.5 },
                  { site: 'LinkedIn', visits: 432, growth: 8.3 },
                  { site: 'Facebook', visits: 298, growth: -2.1 },
                  { site: 'Twitter', visits: 187, growth: 15.7 },
                  { site: 'Other Social', visits: 145, growth: 5.2 }
                ].map((referral) => (
                  <div key={referral.site} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="font-medium">{referral.site}</span>
                    <div className="flex items-center space-x-4">
                      <span className="text-sm">{referral.visits.toLocaleString()} visits</span>
                      <div className="flex items-center">
                        {referral.growth > 0 ? (
                          <TrendingUp className="h-4 w-4 text-green-600 mr-1" />
                        ) : (
                          <TrendingDown className="h-4 w-4 text-red-600 mr-1" />
                        )}
                        <span className={`text-sm ${referral.growth > 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {Math.abs(referral.growth)}%
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
        </>
      )}
    </div>
  );
}
