"use client";

import { useState, useEffect, useCallback } from 'react';
import { InstagramService, InstagramPost, ArtistInstagramConfig } from '@/lib/services/instagram-service';

interface InstagramFeedState {
  posts: Record<string, InstagramPost[]>;
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
}

interface UseInstagramFeedOptions {
  postsPerArtist?: number;
  autoRefresh?: boolean;
  refreshInterval?: number; // in milliseconds
}

export function useInstagramFeed(options: UseInstagramFeedOptions = {}) {
  const {
    postsPerArtist = 1,
    autoRefresh = true,
    refreshInterval = 15 * 60 * 1000 // 15 minutes
  } = options;

  const [state, setState] = useState<InstagramFeedState>({
    posts: {},
    loading: true,
    error: null,
    lastUpdated: null
  });

  const fetchPosts = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));

      const posts = await InstagramService.getAllArtistsPosts(postsPerArtist);

      setState({
        posts,
        loading: false,
        error: null,
        lastUpdated: new Date()
      });
    } catch (error) {
      console.error('Failed to fetch Instagram posts:', error);
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to fetch Instagram posts'
      }));
    }
  }, [postsPerArtist]);

  const refreshPosts = useCallback(() => {
    InstagramService.clearCache();
    fetchPosts();
  }, [fetchPosts]);

  // Initial fetch
  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(fetchPosts, refreshInterval);
    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, fetchPosts]);

  return {
    ...state,
    refreshPosts,
    formatRelativeTime: InstagramService.formatRelativeTime,
    formatNumber: InstagramService.formatNumber,
    getArtistConfig: InstagramService.getArtistConfig
  };
}

// Hook for getting a specific artist's posts
export function useArtistInstagramPosts(artistKey: string, limit: number = 1) {
  const [posts, setPosts] = useState<InstagramPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchArtistPosts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const artistPosts = await InstagramService.getArtistPosts(artistKey, limit);
      setPosts(artistPosts);
    } catch (error) {
      console.error(`Failed to fetch posts for ${artistKey}:`, error);
      setError(error instanceof Error ? error.message : 'Failed to fetch posts');
      setPosts([]);
    } finally {
      setLoading(false);
    }
  }, [artistKey, limit]);

  useEffect(() => {
    fetchArtistPosts();
  }, [fetchArtistPosts]);

  const refresh = useCallback(() => {
    InstagramService.clearCache();
    fetchArtistPosts();
  }, [fetchArtistPosts]);

  return {
    posts,
    loading,
    error,
    refresh,
    config: InstagramService.getArtistConfig(artistKey)
  };
}
