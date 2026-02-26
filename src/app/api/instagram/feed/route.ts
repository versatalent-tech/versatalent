import { NextRequest, NextResponse } from 'next/server';

interface InstagramOEmbedResponse {
  version: string;
  type: string;
  title: string;
  author_name: string;
  author_url: string;
  author_id: number;
  media_id: string;
  provider_name: string;
  provider_url: string;
  html: string;
  width: number;
  height: number;
  thumbnail_url: string;
  thumbnail_width: number;
  thumbnail_height: number;
}

interface InstagramPost {
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
  html?: string;
}

interface ArtistInstagramConfig {
  username: string;
  display_name: string;
  profile_picture: string;
  instagram_url: string;
  account_type: 'personal' | 'business';
  featured_posts: string[];
}

// Artist configurations (this would typically come from a database)
const ARTIST_INSTAGRAM_ACCOUNTS: Record<string, ArtistInstagramConfig> = {
  deejaywg: {
    username: 'deejaywg_',
    display_name: 'Deejay WG',
    profile_picture: '/deejaywg/IMG_8999.jpg',
    instagram_url: 'https://instagram.com/deejaywg_',
    account_type: 'personal',
    featured_posts: [
      'https://www.instagram.com/deejaywg_/p/DOy39hlDF8p/', // Replace with actual URLs
    ]
  },
  jessicadias: {
    username: 'miss_chocolatinha',
    display_name: 'Jessica Dias',
    profile_picture: '/jessicadias/IMG_9288-altered.jpg',
    instagram_url: 'https://instagram.com/miss_chocolatinha',
    account_type: 'personal',
    featured_posts: [
      'https://www.instagram.com/miss_chocolatinha/p/DJRlKRuiq4w/', // Replace with actual URLs
    ]
  },
  joaorodolfo: {
    username: 'joaorodolfo_official',
    display_name: 'João Rodolfo',
    profile_picture: '/joaorodolfo/JROD1.jpg',
    instagram_url: 'https://instagram.com/joaorodolfo_official',
    account_type: 'personal',
    featured_posts: [
      'https://www.instagram.com/joaorodolfo_official/reel/DKMehnEMRSi/', // Replace with actual URLs
    ]
  }
};

// Mock data for fallback
const MOCK_INSTAGRAM_POSTS: Record<string, InstagramPost[]> = {
  'deejaywg_': [
    {
      id: '1',
      username: 'deejaywg_',
      caption: 'Studio vibes tonight 🎵 Working on something special for you all! The energy is unmatched when the music flows. #MusicProducer #StudioLife #NewMusic #ComingSoon',
      media_url: '/deejaywg/IMG_8976.jpg',
      media_type: 'IMAGE',
      permalink: 'https://instagram.com/p/deejaywg_post1',
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      like_count: 1247,
      comments_count: 89
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
      timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
      like_count: 2156,
      comments_count: 143
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
      timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
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
      timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      like_count: 1534,
      comments_count: 98
    }
  ]
};

// Cache for Instagram posts
const cache = new Map<string, { data: InstagramPost[]; timestamp: number }>();
const CACHE_DURATION = 15 * 60 * 1000; // 15 minutes

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const artistKey = searchParams.get('artist');
    const limit = parseInt(searchParams.get('limit') || '1');

    console.log(`[Instagram Feed API] Request for artist: ${artistKey || 'all'}, limit: ${limit}`);

    if (artistKey) {
      // Get posts for specific artist
      const posts = await getArtistPosts(artistKey, limit);
      return NextResponse.json({
        success: true,
        data: { [artistKey]: posts },
        cached: false,
        timestamp: new Date().toISOString()
      });
    } else {
      // Get posts for all artists
      const allPosts = await getAllArtistsPosts(limit);
      return NextResponse.json({
        success: true,
        data: allPosts,
        cached: false,
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    console.error('[Instagram Feed API] Error:', error);
    return NextResponse.json({
      error: 'Failed to fetch Instagram feed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

async function getArtistPosts(artistKey: string, limit: number = 1): Promise<InstagramPost[]> {
  const config = ARTIST_INSTAGRAM_ACCOUNTS[artistKey];
  if (!config) {
    throw new Error(`Artist configuration not found: ${artistKey}`);
  }

  // Check cache first
  const cached = cache.get(config.username);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    console.log(`[Instagram Feed API] Using cached data for ${config.username}`);
    return cached.data.slice(0, limit);
  }

  try {
    // Fetch from Instagram oEmbed API
    const posts = await fetchFromInstagramOEmbed(config);

    // Cache the results
    cache.set(config.username, {
      data: posts,
      timestamp: Date.now()
    });

    console.log(`[Instagram Feed API] Fetched ${posts.length} posts for ${config.username}`);
    return posts.slice(0, limit);
  } catch (error) {
    console.warn(`[Instagram Feed API] Failed to fetch posts for ${config.username}, using fallback data:`, error);

    // Fallback to mock data
    const mockPosts = MOCK_INSTAGRAM_POSTS[config.username] || [];

    // Cache mock data with shorter duration
    cache.set(config.username, {
      data: mockPosts,
      timestamp: Date.now()
    });

    return mockPosts.slice(0, limit);
  }
}

async function getAllArtistsPosts(limit: number = 1): Promise<Record<string, InstagramPost[]>> {
  const results: Record<string, InstagramPost[]> = {};

  // Process artists in parallel for better performance
  const promises = Object.entries(ARTIST_INSTAGRAM_ACCOUNTS).map(async ([artistKey, config]) => {
    try {
      const posts = await getArtistPosts(artistKey, limit);
      return { artistKey, posts };
    } catch (error) {
      console.warn(`[Instagram Feed API] Failed to get posts for ${artistKey}:`, error);
      return { artistKey, posts: [] };
    }
  });

  const artistResults = await Promise.allSettled(promises);

  artistResults.forEach((result) => {
    if (result.status === 'fulfilled') {
      results[result.value.artistKey] = result.value.posts;
    }
  });

  return results;
}

async function fetchFromInstagramOEmbed(config: ArtistInstagramConfig): Promise<InstagramPost[]> {
  const posts: InstagramPost[] = [];

  // Process each featured post URL
  for (const postUrl of config.featured_posts) {
    if (!postUrl.trim()) continue;

    try {
      const oembedData = await fetchSinglePostOEmbed(postUrl);
      const post = convertOEmbedToPost(oembedData, config);
      posts.push(post);
    } catch (error) {
      console.warn(`[Instagram Feed API] Failed to fetch post ${postUrl}:`, error);
      // Continue with other posts even if one fails
    }
  }

  if (posts.length === 0) {
    throw new Error('No posts could be fetched from Instagram API');
  }

  return posts;
}

async function fetchSinglePostOEmbed(postUrl: string): Promise<InstagramOEmbedResponse> {
  // Try multiple oEmbed endpoints
  const endpoints = [
    // Primary: Facebook Graph API oEmbed (no access token needed for public posts)
    `https://graph.facebook.com/v18.0/instagram_oembed?url=${encodeURIComponent(postUrl)}`,
    // Fallback: Instagram's own oEmbed endpoint
    `https://api.instagram.com/oembed/?url=${encodeURIComponent(postUrl)}`,
  ];

  let lastError: Error | null = null;

  for (const endpoint of endpoints) {
    try {
      console.log(`[Instagram Feed API] Attempting to fetch from: ${endpoint}`);

      const response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'VersaTalent-Website/1.0'
        },
        // Add timeout to prevent hanging requests
        signal: AbortSignal.timeout(10000) // 10 second timeout
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log(`[Instagram Feed API] Successfully fetched oEmbed data from ${endpoint}`);

      return data as InstagramOEmbedResponse;
    } catch (error) {
      console.warn(`[Instagram Feed API] Failed to fetch from ${endpoint}:`, error);
      lastError = error instanceof Error ? error : new Error(String(error));
    }
  }

  throw lastError || new Error('All oEmbed endpoints failed');
}

function convertOEmbedToPost(
  oembedData: InstagramOEmbedResponse,
  config: ArtistInstagramConfig
): InstagramPost {
  // Extract post ID from media_id or generate one
  const postId = oembedData.media_id || `oembed_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // Extract shortcode from HTML or generate permalink
  const shortcodeMatch = oembedData.html?.match(/\/p\/([A-Za-z0-9_-]+)\//);
  const shortcode = shortcodeMatch ? shortcodeMatch[1] : 'unknown';
  const permalink = `https://www.instagram.com/p/${shortcode}/`;

  // Extract caption from title or HTML
  let caption = oembedData.title || '';

  // Try to extract more detailed caption from HTML if available
  if (oembedData.html && !caption) {
    const htmlMatch = oembedData.html.match(/data-instgrm-caption="([^"]*)"/) ||
                      oembedData.html.match(/alt="([^"]*)"/) ||
                      oembedData.html.match(/title="([^"]*)"/) ||
                      [];
    caption = htmlMatch[1] || 'Check out this post on Instagram';
  }

  // Clean up caption (remove HTML entities, etc.)
  caption = caption.replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');

  return {
    id: postId,
    username: config.username,
    caption: caption,
    media_url: oembedData.thumbnail_url || config.profile_picture,
    media_type: 'IMAGE', // oEmbed typically returns images
    permalink: permalink,
    timestamp: new Date().toISOString(), // oEmbed doesn't provide timestamp
    thumbnail_url: oembedData.thumbnail_url,
    html: oembedData.html,
    // Note: oEmbed doesn't provide like/comment counts
    // These would need Instagram Basic Display API or Instagram Graph API
  };
}

// Handle OPTIONS for CORS
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
