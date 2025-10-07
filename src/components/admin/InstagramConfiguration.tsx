"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Instagram,
  ExternalLink,
  Save,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Eye,
  Plus,
  Trash2,
  Copy
} from 'lucide-react';
import { InstagramService, ARTIST_INSTAGRAM_ACCOUNTS, ArtistInstagramConfig } from '@/lib/services/instagram-service';

interface InstagramConfigurationProps {
  onUpdate?: () => void;
}

interface TestResult {
  success: boolean;
  data?: {
    media_id: string;
    author_name: string;
    author_url: string;
    title: string;
    thumbnail_url: string;
    html: string;
    width: number;
    height: number;
    provider_name: string;
    endpoint_used: string;
  };
  error?: string;
}

interface CacheStats {
  postCount: number;
  cachedAt: string;
  expiresAt: string;
  isExpired: boolean;
}

export function InstagramConfiguration({ onUpdate }: InstagramConfigurationProps) {
  const [artistConfigs, setArtistConfigs] = useState<Record<string, ArtistInstagramConfig>>({});
  const [loading, setLoading] = useState(false);
  const [testingPost, setTestingPost] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [saveStatus, setSaveStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    setArtistConfigs({ ...ARTIST_INSTAGRAM_ACCOUNTS });
  }, []);

  const handlePostUrlChange = (artistKey: string, index: number, newUrl: string) => {
    setArtistConfigs(prev => ({
      ...prev,
      [artistKey]: {
        ...prev[artistKey],
        featured_posts: prev[artistKey].featured_posts.map((url, i) =>
          i === index ? newUrl : url
        )
      }
    }));
  };

  const addPostUrl = (artistKey: string) => {
    setArtistConfigs(prev => ({
      ...prev,
      [artistKey]: {
        ...prev[artistKey],
        featured_posts: [...prev[artistKey].featured_posts, '']
      }
    }));
  };

  const removePostUrl = (artistKey: string, index: number) => {
    setArtistConfigs(prev => ({
      ...prev,
      [artistKey]: {
        ...prev[artistKey],
        featured_posts: prev[artistKey].featured_posts.filter((_, i) => i !== index)
      }
    }));
  };

  const testInstagramPost = async (postUrl: string) => {
    if (!postUrl.trim()) return;

    setTestingPost(postUrl);
    setTestResult(null);

    try {
      const result = await InstagramService.testInstagramPost(postUrl);
      setTestResult(result);
    } catch (error) {
      setTestResult({
        success: false,
        error: error instanceof Error ? error.message : 'Network error'
      });
    } finally {
      setTestingPost(null);
    }
  };

  const saveConfiguration = async () => {
    setLoading(true);
    setSaveStatus(null);

    try {
      // Validate URLs
      for (const [artistKey, config] of Object.entries(artistConfigs)) {
        for (const postUrl of config.featured_posts) {
          if (postUrl && !isValidInstagramUrl(postUrl)) {
            throw new Error(`Invalid Instagram URL for ${config.display_name}: ${postUrl}`);
          }
        }
      }

      // Update the configurations
      for (const [artistKey, config] of Object.entries(artistConfigs)) {
        InstagramService.updateArtistPosts(
          artistKey,
          config.featured_posts.filter(url => url.trim() !== '')
        );
      }

      // Clear cache to force refresh
      InstagramService.clearCache();

      setSaveStatus({ type: 'success', message: 'Configuration saved successfully!' });
      onUpdate?.();
    } catch (error) {
      setSaveStatus({
        type: 'error',
        message: error instanceof Error ? error.message : 'Failed to save configuration'
      });
    } finally {
      setLoading(false);
    }
  };

  const refreshCache = () => {
    InstagramService.clearCache();
    setSaveStatus({ type: 'success', message: 'Cache cleared successfully!' });
    onUpdate?.();
  };

  const isValidInstagramUrl = (url: string): boolean => {
    const instagramPostRegex = /^https:\/\/(www\.)?instagram\.com\/p\/[A-Za-z0-9_-]+\/?$/;
    return instagramPostRegex.test(url);
  };

  const extractShortcode = (url: string): string => {
    const match = url.match(/\/p\/([A-Za-z0-9_-]+)\/?$/);
    return match ? match[1] : '';
  };

  const getCacheStats = () => {
    return InstagramService.getCacheStats();
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Instagram className="h-6 w-6 text-purple-600" />
              <CardTitle>Instagram Configuration</CardTitle>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={refreshCache}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Clear Cache
              </Button>
              <Button onClick={saveConfiguration} disabled={loading}>
                <Save className="h-4 w-4 mr-2" />
                {loading ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {saveStatus && (
            <Alert className={`mb-4 ${saveStatus.type === 'success' ? 'border-green-200' : 'border-red-200'}`}>
              {saveStatus.type === 'success' ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : (
                <AlertCircle className="h-4 w-4 text-red-600" />
              )}
              <AlertDescription className={saveStatus.type === 'success' ? 'text-green-800' : 'text-red-800'}>
                {saveStatus.message}
              </AlertDescription>
            </Alert>
          )}

          <Tabs defaultValue="artists" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="artists">Artist Posts</TabsTrigger>
              <TabsTrigger value="testing">Test Posts</TabsTrigger>
              <TabsTrigger value="cache">Cache Status</TabsTrigger>
            </TabsList>

            <TabsContent value="artists" className="space-y-6">
              {Object.entries(artistConfigs).map(([artistKey, config]) => (
                <Card key={artistKey}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <img
                          src={config.profile_picture}
                          alt={config.display_name}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                        <div>
                          <CardTitle className="text-lg">{config.display_name}</CardTitle>
                          <p className="text-sm text-gray-600">@{config.username}</p>
                        </div>
                      </div>
                      <Badge variant="outline">
                        {config.featured_posts.filter(url => url.trim()).length} posts
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {config.featured_posts.map((postUrl, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <div className="flex-1">
                          <Label htmlFor={`${artistKey}-post-${index}`} className="text-sm">
                            Post URL {index + 1}
                          </Label>
                          <div className="flex items-center gap-2 mt-1">
                            <Input
                              id={`${artistKey}-post-${index}`}
                              value={postUrl}
                              onChange={(e) => handlePostUrlChange(artistKey, index, e.target.value)}
                              placeholder="https://www.instagram.com/p/SHORTCODE/"
                              className={`${
                                postUrl && !isValidInstagramUrl(postUrl)
                                  ? 'border-red-300 focus:border-red-500'
                                  : ''
                              }`}
                            />
                            {postUrl && (
                              <>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => testInstagramPost(postUrl)}
                                  disabled={testingPost === postUrl}
                                >
                                  {testingPost === postUrl ? (
                                    <RefreshCw className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <Eye className="h-4 w-4" />
                                  )}
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => window.open(postUrl, '_blank')}
                                >
                                  <ExternalLink className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => removePostUrl(artistKey, index)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                          {postUrl && !isValidInstagramUrl(postUrl) && (
                            <p className="text-xs text-red-600 mt-1">
                              Invalid Instagram post URL format
                            </p>
                          )}
                          {postUrl && isValidInstagramUrl(postUrl) && (
                            <p className="text-xs text-gray-500 mt-1">
                              Shortcode: {extractShortcode(postUrl)}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}

                    <Button
                      variant="outline"
                      onClick={() => addPostUrl(artistKey)}
                      className="w-full"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Post URL
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>

            <TabsContent value="testing" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Test Instagram Post</CardTitle>
                  <p className="text-sm text-gray-600">
                    Test any Instagram post URL to see how it will be fetched
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Input
                      placeholder="https://www.instagram.com/p/SHORTCODE/"
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          testInstagramPost((e.target as HTMLInputElement).value);
                        }
                      }}
                    />
                    <Button
                      onClick={() => {
                        const input = document.querySelector('input[placeholder*="instagram.com"]') as HTMLInputElement;
                        if (input) testInstagramPost(input.value);
                      }}
                      disabled={!!testingPost}
                    >
                      {testingPost ? (
                        <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <Eye className="h-4 w-4 mr-2" />
                      )}
                      Test
                    </Button>
                  </div>

                  {testResult && (
                    <Alert className={testResult.success ? 'border-green-200' : 'border-red-200'}>
                      {testResult.success ? (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-red-600" />
                      )}
                      <AlertDescription>
                        {testResult.success ? (
                          <div className="space-y-2">
                            <p className="font-medium text-green-800">Test successful!</p>
                            <div className="text-sm text-green-700">
                              <p><strong>Author:</strong> {testResult.data?.author_name}</p>
                              <p><strong>Title:</strong> {testResult.data?.title}</p>
                              <p><strong>Media ID:</strong> {testResult.data?.media_id}</p>
                              {testResult.data?.thumbnail_url && (
                                <p><strong>Thumbnail:</strong> Available</p>
                              )}
                            </div>
                          </div>
                        ) : (
                          <p className="text-red-800">
                            <strong>Error:</strong> {testResult.error}
                          </p>
                        )}
                      </AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="cache" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Cache Status</CardTitle>
                  <p className="text-sm text-gray-600">
                    View current cache status for Instagram posts
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {Object.entries(getCacheStats()).map(([username, stats]) => {
                      const cacheStats = stats as CacheStats;
                      return (
                        <div key={username} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div>
                            <p className="font-medium">@{username}</p>
                            <p className="text-sm text-gray-600">
                              {cacheStats.postCount} posts cached
                            </p>
                          </div>
                          <div className="text-right">
                            <Badge variant={cacheStats.isExpired ? "destructive" : "default"}>
                              {cacheStats.isExpired ? "Expired" : "Active"}
                            </Badge>
                            <p className="text-xs text-gray-500 mt-1">
                              Expires: {new Date(cacheStats.expiresAt).toLocaleTimeString()}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Usage Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>Usage Instructions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm text-gray-600 space-y-2">
            <p><strong>1. Finding Instagram Post URLs:</strong></p>
            <ul className="list-disc list-inside ml-4 space-y-1">
              <li>Go to the Instagram post you want to feature</li>
              <li>Click the three dots (...) on the post</li>
              <li>Select "Copy link" or "Share" → "Copy link"</li>
              <li>The URL should look like: https://www.instagram.com/p/SHORTCODE/</li>
            </ul>

            <p><strong>2. Best Practices:</strong></p>
            <ul className="list-disc list-inside ml-4 space-y-1">
              <li>Use recent, high-engagement posts</li>
              <li>Ensure posts are public (not private accounts)</li>
              <li>Test each URL before saving</li>
              <li>Keep 1-3 posts per artist for best performance</li>
            </ul>

            <p><strong>3. Troubleshooting:</strong></p>
            <ul className="list-disc list-inside ml-4 space-y-1">
              <li>If a post fails to load, check if the account is public</li>
              <li>Some posts may be restricted by Instagram's API</li>
              <li>Cache is automatically cleared every 15 minutes</li>
              <li>Fallback images will be used if Instagram API fails</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
