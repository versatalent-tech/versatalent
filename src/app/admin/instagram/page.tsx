"use client";

import { useState, Suspense } from 'react';
import dynamic from 'next/dynamic';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Instagram,
  Settings,
  AlertCircle,
  CheckCircle,
  RefreshCw,
  ExternalLink,
  Eye
} from 'lucide-react';
import { InstagramService } from '@/lib/services/instagram-service';
import { useInstagramFeed } from '@/lib/hooks/useInstagramFeed';

// Dynamically import Instagram configuration to prevent SSR issues
const InstagramConfiguration = dynamic(
  () => import('@/components/admin/InstagramConfiguration').then(mod => ({ default: mod.InstagramConfiguration })),
  {
    loading: () => <div className="animate-pulse bg-gray-200 h-96 rounded-lg"></div>,
    ssr: false
  }
);

export default function InstagramAdminPage() {
  const [refreshKey, setRefreshKey] = useState(0);
  const {
    posts,
    loading,
    error,
    lastUpdated,
    refreshPosts
  } = useInstagramFeed({
    postsPerArtist: 1,
    autoRefresh: false
  });

  const handleConfigUpdate = () => {
    // Trigger a refresh of the Instagram feed
    setRefreshKey(prev => prev + 1);
    refreshPosts();
  };

  const configStatus = InstagramService.getConfigurationStatus();
  const isConfigured = InstagramService.isConfigured();

  return (
    <MainLayout>
      <div className="bg-gray-50 min-h-screen py-8">
        <div className="container px-4 mx-auto">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Instagram className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Instagram Administration</h1>
                <p className="text-gray-600">Manage Instagram integration for VersaTalent artists</p>
              </div>
            </div>

            {/* Configuration Status Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              {Object.entries(configStatus).map(([artistKey, status]) => {
                const config = InstagramService.getArtistConfig(artistKey);
                if (!config) return null;

                return (
                  <Card key={artistKey} className="relative">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <img
                            src={config.profile_picture}
                            alt={config.display_name}
                            className="w-8 h-8 rounded-full object-cover"
                          />
                          <div>
                            <p className="font-medium text-sm">{config.display_name}</p>
                            <p className="text-xs text-gray-500">@{config.username}</p>
                          </div>
                        </div>
                        <Badge variant={status.configured ? "default" : "destructive"} className="text-xs">
                          {status.configured ? "Configured" : "Not Set"}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="text-xs text-gray-600">
                        <p>{status.validUrls}/{status.postCount} valid URLs</p>
                        <p>Posts loaded: {posts[artistKey]?.length || 0}</p>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Overall Status Alert */}
            <Alert className={isConfigured ? 'border-green-200' : 'border-yellow-200'}>
              {isConfigured ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : (
                <AlertCircle className="h-4 w-4 text-yellow-600" />
              )}
              <AlertDescription className={isConfigured ? 'text-green-800' : 'text-yellow-800'}>
                {isConfigured ? (
                  <span>
                    Instagram integration is configured and active.
                    {lastUpdated && ` Last updated: ${lastUpdated.toLocaleTimeString()}`}
                  </span>
                ) : (
                  'Instagram integration needs configuration. Add post URLs below to enable live Instagram feeds.'
                )}
              </AlertDescription>
            </Alert>
          </div>

          {/* Live Feed Preview */}
          {isConfigured && (
            <Card className="mb-8">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Eye className="h-5 w-5" />
                    Live Feed Preview
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={refreshPosts} disabled={loading}>
                      <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                      Refresh
                    </Button>
                    <Button variant="outline" size="sm" asChild>
                      <a href="/" target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-4 w-4 mr-2" />
                        View Live Site
                      </a>
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {error ? (
                  <Alert className="border-red-200">
                    <AlertCircle className="h-4 w-4 text-red-600" />
                    <AlertDescription className="text-red-800">
                      Error loading Instagram feed: {error}
                    </AlertDescription>
                  </Alert>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {Object.entries(posts).map(([artistKey, artistPosts]) => {
                      const config = InstagramService.getArtistConfig(artistKey);
                      const post = artistPosts[0];

                      if (!config || !post) return null;

                      return (
                        <div key={artistKey} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                          <div className="p-3 border-b border-gray-100">
                            <div className="flex items-center gap-2">
                              <img
                                src={config.profile_picture}
                                alt={config.display_name}
                                className="w-6 h-6 rounded-full object-cover"
                              />
                              <div>
                                <p className="font-medium text-sm">{config.display_name}</p>
                                <p className="text-xs text-gray-500">@{config.username}</p>
                              </div>
                            </div>
                          </div>
                          <div className="aspect-square">
                            <img
                              src={post.media_url}
                              alt="Instagram post"
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="p-3">
                            <p className="text-sm text-gray-800 line-clamp-2">
                              {post.caption}
                            </p>
                            <div className="flex items-center justify-between mt-2">
                              <p className="text-xs text-gray-500">
                                {InstagramService.formatRelativeTime(post.timestamp)}
                              </p>
                              <a
                                href={post.permalink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-purple-600 hover:text-purple-700"
                              >
                                View on Instagram
                              </a>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {loading && (
                  <div className="flex items-center justify-center py-8">
                    <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
                    <span className="ml-2 text-gray-500">Loading Instagram posts...</span>
                  </div>
                )}

                {!loading && Object.keys(posts).length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <Instagram className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No Instagram posts loaded. Configure post URLs below.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Instagram Configuration Component */}
          <Suspense fallback={<div className="animate-pulse bg-gray-200 h-96 rounded-lg"></div>}>
            <InstagramConfiguration key={refreshKey} onUpdate={handleConfigUpdate} />
          </Suspense>

          {/* API Documentation */}
          <Card className="mt-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                API Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 text-sm text-gray-600">
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Available Endpoints:</h4>
                  <ul className="space-y-1 list-disc list-inside">
                    <li><code className="bg-gray-100 px-2 py-1 rounded text-xs">/api/instagram/feed</code> - Get all artist posts</li>
                    <li><code className="bg-gray-100 px-2 py-1 rounded text-xs">/api/instagram/feed?artist=artistKey</code> - Get specific artist posts</li>
                    <li><code className="bg-gray-100 px-2 py-1 rounded text-xs">/api/instagram/test</code> - Test individual post URLs</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Technical Details:</h4>
                  <ul className="space-y-1 list-disc list-inside">
                    <li>Uses Instagram oEmbed API for fetching public posts</li>
                    <li>Server-side fetching to avoid CORS issues</li>
                    <li>15-minute cache duration for optimal performance</li>
                    <li>Automatic fallback to mock data if API fails</li>
                    <li>Supports multiple oEmbed endpoints for reliability</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Limitations:</h4>
                  <ul className="space-y-1 list-disc list-inside">
                    <li>Only works with public Instagram posts</li>
                    <li>oEmbed API doesn't provide like/comment counts</li>
                    <li>Rate limiting may apply for high-frequency requests</li>
                    <li>Post URLs must be in exact Instagram format</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
}
