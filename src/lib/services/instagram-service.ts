// Instagram Integration Service with Server-Side API Integration
export interface InstagramPost {
  id: string;
  username: string;
  caption: string;
  media_url: string;
  media_type: 'IMAGE' | 'VIDEO' | 'CAROUSEL_ALBUM';
  permalink: string;
  timestamp: string;
  like_count?: number;
  comments_count?: number;
  thumbnail_url?: string;
  html?: string; // For oEmbed HTML content
}

export interface ArtistInstagramConfig {
  username: string;
  display_name: string;
  profile_picture: string;
  instagram_url: string;
  account_type: 'personal' | 'business';
  // Specific post URLs for oEmbed API
  featured_posts: string[];
}

// Artist Instagram configurations with specific post URLs
export const ARTIST_INSTAGRAM_ACCOUNTS: Record<string, ArtistInstagramConfig> = {
  deejaywg: {
    username: 'deejaywg_',
    display_name: 'Deejay WG',
    profile_picture: '/deejaywg/IMG_8999.jpg',
    instagram_url: 'https://instagram.com/deejaywg_',
    account_type: 'personal',
    featured_posts: [
      // Replace these with actual Instagram post URLs from the artists
      // Example: 'https://www.instagram.com/p/C9XzQzxN8mP/',
      // You can find these by:
      // 1. Going to the Instagram post
      // 2. Clicking "..." and selecting "Copy link"
      // 3. Pasting the URL here
      'https://www.instagram.com/deejaywg_/p/DOy39hlDF8p/',
      'https://www.instagram.com/deejaywg_/p/DPRrq80CBl1/'
    ]
  },
  jessicadias: {
    username: 'miss_chocolatinha',
    display_name: 'Jessica Dias',
    profile_picture: '/jessicadias/IMG_9288-altered.jpg',
    instagram_url: 'https://instagram.com/miss_chocolatinha',
    account_type: 'personal',
    featured_posts: [
      // Add actual Instagram post URLs here
      'https://www.instagram.com/miss_chocolatinha/p/DLzdlCNC4JY/',
      'https://www.instagram.com/miss_chocolatinha/p/DJRlKRuiq4w/s'
    ]
  },
  joaorodolfo: {
    username: 'joaorodolfo_official',
    display_name: 'João Rodolfo',
    profile_picture: '/joaorodolfo/billboard.PNG',
    instagram_url: 'https://instagram.com/joaorodolfo_official',
    account_type: 'personal',
    featured_posts: [
      // Add actual Instagram post URLs here
      'https://www.instagram.com/joaorodolfo_official/reel/DKMehnEMRSi/'
    ]
  },
  antoniomonteiro: {
    username: 'antoniolaflare98',
    display_name: 'Antonio Monteiro',
    profile_picture: '/antoniomonteiro/Tonecas_1.jpg',
    instagram_url: 'https://instagram.com/antoniolaflare98',
    account_type: 'personal',
    featured_posts: [
      // Add actual Instagram post URLs here
    ]
  }
};

// API response interface
interface InstagramAPIResponse {
  success: boolean;
  data: Record<string, InstagramPost[]>;
  cached?: boolean;
  timestamp: string;
  error?: string;
}

export class InstagramService {
  private static readonly CACHE_DURATION = 15 * 60 * 1000; // 15 minutes
  private static cache: Map<string, { data: InstagramPost[]; timestamp: number }> = new Map();

  /**
   * Get Instagram posts for a specific artist using server-side API
   */
  static async getArtistPosts(artistKey: string, limit: number = 1): Promise<InstagramPost[]> {
    const config = ARTIST_INSTAGRAM_ACCOUNTS[artistKey];
    if (!config) {
      throw new Error(`Artist configuration not found: ${artistKey}`);
    }

    // Check local cache first
    const cached = this.cache.get(config.username);
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.data.slice(0, limit);
    }

    try {
      // Call our server-side API
      const response = await fetch(`/api/instagram/feed?artist=${encodeURIComponent(artistKey)}&limit=${limit}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
        // Add timeout to prevent hanging requests
        signal: AbortSignal.timeout(15000) // 15 second timeout
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: `HTTP ${response.status}` }));
        throw new Error(errorData.error || `Failed to fetch posts: HTTP ${response.status}`);
      }

      const result: InstagramAPIResponse = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'API request failed');
      }

      const posts = result.data[artistKey] || [];

      // Cache the results locally
      this.cache.set(config.username, {
        data: posts,
        timestamp: Date.now()
      });

      return posts.slice(0, limit);
    } catch (error) {
      console.warn(`Failed to fetch Instagram posts for ${config.username} via API:`, error);

      // Return empty array as fallback (the API handles mock data fallback)
      return [];
    }
  }

  /**
   * Get posts for all artists using server-side API
   */
  static async getAllArtistsPosts(limit: number = 1): Promise<Record<string, InstagramPost[]>> {
    try {
      // Call our server-side API for all artists
      const response = await fetch(`/api/instagram/feed?limit=${limit}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
        // Add timeout to prevent hanging requests
        signal: AbortSignal.timeout(20000) // 20 second timeout for all artists
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: `HTTP ${response.status}` }));
        throw new Error(errorData.error || `Failed to fetch posts: HTTP ${response.status}`);
      }

      const result: InstagramAPIResponse = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'API request failed');
      }

      // Cache results locally for each artist
      Object.entries(result.data).forEach(([artistKey, posts]) => {
        const config = ARTIST_INSTAGRAM_ACCOUNTS[artistKey];
        if (config) {
          this.cache.set(config.username, {
            data: posts,
            timestamp: Date.now()
          });
        }
      });

      return result.data;
    } catch (error) {
      console.warn('Failed to fetch Instagram posts for all artists via API:', error);

      // Return empty object as fallback
      return {};
    }
  }

  /**
   * Test a specific Instagram post URL
   */
  static async testInstagramPost(postUrl: string): Promise<{ success: boolean; data?: Record<string, unknown>; error?: string }> {
    try {
      const response = await fetch('/api/instagram/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ postUrl }),
        signal: AbortSignal.timeout(15000) // 15 second timeout
      });

      const result = await response.json();

      if (response.ok && result.success) {
        return { success: true, data: result.data };
      } else {
        return { success: false, error: result.error || result.details || 'Unknown error' };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error'
      };
    }
  }

  /**
   * Format relative time (e.g., "2 hours ago")
   */
  static formatRelativeTime(timestamp: string): string {
    const now = new Date();
    const postTime = new Date(timestamp);
    const diffMs = now.getTime() - postTime.getTime();

    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMinutes < 60) {
      return `${diffMinutes}m ago`;
    } else if (diffHours < 24) {
      return `${diffHours}h ago`;
    } else if (diffDays < 7) {
      return `${diffDays}d ago`;
    } else {
      return postTime.toLocaleDateString();
    }
  }

  /**
   * Format numbers (e.g., 1247 -> 1.2k)
   */
  static formatNumber(num: number): string {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'k';
    }
    return num.toString();
  }

  /**
   * Get artist configuration
   */
  static getArtistConfig(artistKey: string): ArtistInstagramConfig | null {
    return ARTIST_INSTAGRAM_ACCOUNTS[artistKey] || null;
  }

  /**
   * Clear local cache (useful for testing or manual refresh)
   */
  static clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get cache stats for debugging
   */
  static getCacheStats(): Record<string, unknown> {
    const stats: Record<string, unknown> = {};

    for (const [username, cached] of this.cache.entries()) {
      stats[username] = {
        postCount: cached.data.length,
        cachedAt: new Date(cached.timestamp).toISOString(),
        expiresAt: new Date(cached.timestamp + this.CACHE_DURATION).toISOString(),
        isExpired: Date.now() - cached.timestamp > this.CACHE_DURATION
      };
    }

    return stats;
  }

  /**
   * Update artist post URLs (for admin use)
   * Note: This only updates the client-side config.
   * For persistence, you'd need to store these in a database.
   */
  static updateArtistPosts(artistKey: string, postUrls: string[]): boolean {
    if (!ARTIST_INSTAGRAM_ACCOUNTS[artistKey]) {
      return false;
    }

    ARTIST_INSTAGRAM_ACCOUNTS[artistKey].featured_posts = postUrls;

    // Clear cache for this artist to force refresh
    const config = ARTIST_INSTAGRAM_ACCOUNTS[artistKey];
    this.cache.delete(config.username);

    return true;
  }

  /**
   * Validate Instagram post URL format
   */
  static isValidInstagramUrl(url: string): boolean {
    const instagramPostRegex = /^https:\/\/(www\.)?instagram\.com\/p\/[A-Za-z0-9_-]+\/?$/;
    return instagramPostRegex.test(url);
  }

  /**
   * Extract shortcode from Instagram URL
   */
  static extractShortcode(url: string): string {
    const match = url.match(/\/p\/([A-Za-z0-9_-]+)\/?$/);
    return match ? match[1] : '';
  }

  /**
   * Check if Instagram integration is properly configured
   */
  static isConfigured(): boolean {
    return Object.values(ARTIST_INSTAGRAM_ACCOUNTS).some(config =>
      config.featured_posts.length > 0 &&
      config.featured_posts.some(url => this.isValidInstagramUrl(url))
    );
  }

  /**
   * Get configuration status for all artists
   */
  static getConfigurationStatus(): Record<string, { configured: boolean; postCount: number; validUrls: number }> {
    const status: Record<string, { configured: boolean; postCount: number; validUrls: number }> = {};

    Object.entries(ARTIST_INSTAGRAM_ACCOUNTS).forEach(([artistKey, config]) => {
      const validUrls = config.featured_posts.filter(url => url.trim() && this.isValidInstagramUrl(url)).length;
      status[artistKey] = {
        configured: validUrls > 0,
        postCount: config.featured_posts.length,
        validUrls
      };
    });

    return status;
  }
}

// Export types and constants for use in components
// ARTIST_INSTAGRAM_ACCOUNTS is already exported above with the const declaration
