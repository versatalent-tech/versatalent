// Instagram Integration Service
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
}

export interface ArtistInstagramConfig {
  username: string;
  display_name: string;
  profile_picture: string;
  instagram_url: string;
  account_type: 'personal' | 'business';
}

// Artist Instagram configurations
export const ARTIST_INSTAGRAM_ACCOUNTS: Record<string, ArtistInstagramConfig> = {
  deejaywg: {
    username: 'deejaywg_',
    display_name: 'Deejay WG',
    profile_picture: '/deejaywg/IMG_8999.jpg',
    instagram_url: 'https://instagram.com/deejaywg_',
    account_type: 'business'
  },
  jessicadias: {
    username: 'miss_chocolatinha',
    display_name: 'Jessica Dias',
    profile_picture: '/jessicadias/IMG_9288-altered.jpg',
    instagram_url: 'https://instagram.com/miss_chocolatinha',
    account_type: 'business'
  },
  joaorodolfo: {
    username: 'joaorodolfo_official',
    display_name: 'João Rodolfo',
    profile_picture: '/joaorodolfo/billboard.PNG',
    instagram_url: 'https://instagram.com/joaorodolfo_official',
    account_type: 'business'
  },
  antoniomonteiro: {
    username: 'antoniolaflare98',
    display_name: 'Antonio Monteiro',
    profile_picture: '/antoniomonteiro/Tonecas_1.jpg',
    instagram_url: 'https://instagram.com/antoniolaflare98',
    account_type: 'business'
  }
};

// Mock Instagram posts (fallback data while API integration is being set up)
const MOCK_INSTAGRAM_POSTS: Record<string, InstagramPost[]> = {
  'deejaywg_': [
    {
      id: '1',
      username: 'deejaywg_',
      caption: 'Studio vibes tonight 🎵 Working on something special for you all! The energy is unmatched when the music flows. #MusicProducer #StudioLife #NewMusic #ComingSoon',
      media_url: '/deejaywg/IMG_8976.jpg',
      media_type: 'IMAGE',
      permalink: 'https://instagram.com/p/deejaywg_post1',
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
      like_count: 1247,
      comments_count: 89
    },
    {
      id: '2',
      username: 'deejaywg_',
      caption: 'Equipment check before tonight\'s gig 🎧 The connection between artist and audience starts with perfect sound. Ready to make some magic! #DJ #LivePerformance #MusicIsLife',
      media_url: '/deejaywg/IMG_8987.jpg',
      media_type: 'IMAGE',
      permalink: 'https://instagram.com/p/deejaywg_post2',
      timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
      like_count: 967,
      comments_count: 54
    }
  ],
  'miss_chocolatinha': [
    {
      id: '3',
      username: 'miss_chocolatinha',
      caption: 'Behind the scenes of today\'s fashion shoot ✨ Grateful for amazing teams that bring visions to life. This collection speaks to my soul! #BehindTheScenes #FashionShoot #Grateful #Modeling',
      media_url: '/jessicadias/IMG_9214-altered.jpg',
      media_type: 'IMAGE',
      permalink: 'https://instagram.com/p/jessicadias_post1',
      timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(), // 5 hours ago
      like_count: 2156,
      comments_count: 143
    },
    {
      id: '4',
      username: 'miss_chocolatinha',
      caption: 'Natural light is everything 📸 Sometimes the best shots happen in the simplest moments. Feeling grateful for this journey and everyone supporting it! #NaturalLight #Modeling #Grateful',
      media_url: '/jessicadias/IMG_9365-altered.jpg',
      media_type: 'IMAGE',
      permalink: 'https://instagram.com/p/jessicadias_post2',
      timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days ago
      like_count: 1823,
      comments_count: 112
    }
  ],
  'joaorodolfo_official': [
    {
      id: '5',
      username: 'joaorodolfo_official',
      caption: 'Rehearsing for the cultural night performance 🇬🇼 Bringing the sounds of Guiné-Bissau to Leeds! Music connects us all across borders. #GuinéBissau #CulturalNight #WorldMusic #Gumbé',
      media_url: '/joaorodolfo/camera.PNG',
      media_type: 'IMAGE',
      permalink: 'https://instagram.com/p/joaorodolfo_post1',
      timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
      like_count: 892,
      comments_count: 67
    }
  ],
  'antoniolaflare98': [
    {
      id: '6',
      username: 'antoniolaflare98',
      caption: 'Match day preparation 💪 Every training session gets me closer to the goal. Dedication pays off when it matters most. #MatchDay #Football #DedicationPaysOff #Training',
      media_url: '/antoniomonteiro/Tonecas_3.jpg',
      media_type: 'IMAGE',
      permalink: 'https://instagram.com/p/antonio_post1',
      timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
      like_count: 1534,
      comments_count: 98
    }
  ]
};

export class InstagramService {
  private static readonly CACHE_DURATION = 15 * 60 * 1000; // 15 minutes
  private static cache: Map<string, { data: InstagramPost[]; timestamp: number }> = new Map();

  /**
   * Get Instagram posts for a specific artist
   */
  static async getArtistPosts(artistKey: string, limit: number = 1): Promise<InstagramPost[]> {
    const config = ARTIST_INSTAGRAM_ACCOUNTS[artistKey];
    if (!config) {
      throw new Error(`Artist configuration not found: ${artistKey}`);
    }

    // Check cache first
    const cached = this.cache.get(config.username);
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.data.slice(0, limit);
    }

    try {
      // Try to fetch from real Instagram API (when available)
      const posts = await this.fetchFromInstagramAPI(config.username);

      // Cache the results
      this.cache.set(config.username, {
        data: posts,
        timestamp: Date.now()
      });

      return posts.slice(0, limit);
    } catch (error) {
      console.warn(`Failed to fetch Instagram posts for ${config.username}, using fallback data:`, error);

      // Fallback to mock data
      const mockPosts = MOCK_INSTAGRAM_POSTS[config.username] || [];
      return mockPosts.slice(0, limit);
    }
  }

  /**
   * Get posts for all artists
   */
  static async getAllArtistsPosts(limit: number = 1): Promise<Record<string, InstagramPost[]>> {
    const results: Record<string, InstagramPost[]> = {};

    for (const [artistKey, config] of Object.entries(ARTIST_INSTAGRAM_ACCOUNTS)) {
      try {
        results[artistKey] = await this.getArtistPosts(artistKey, limit);
      } catch (error) {
        console.warn(`Failed to get posts for ${artistKey}:`, error);
        results[artistKey] = [];
      }
    }

    return results;
  }

  /**
   * Fetch from Instagram API (placeholder for real implementation)
   */
  private static async fetchFromInstagramAPI(username: string): Promise<InstagramPost[]> {
    // This is where you would implement the actual Instagram API call
    // Options include:
    // 1. Instagram Basic Display API (requires user authentication)
    // 2. Instagram Graph API (requires business account)
    // 3. Third-party services like RapidAPI Instagram scrapers
    // 4. Instagram embed API for specific posts

    // For now, throw an error to fall back to mock data
    throw new Error('Instagram API not yet configured');
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
    } else {
      return `${diffDays}d ago`;
    }
  }

  /**
   * Format numbers (e.g., 1247 -> 1.2k)
   */
  static formatNumber(num: number): string {
    if (num >= 1000) {
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
   * Clear cache (useful for testing or manual refresh)
   */
  static clearCache(): void {
    this.cache.clear();
  }
}

// Export types and constants for use in components
export { MOCK_INSTAGRAM_POSTS };
