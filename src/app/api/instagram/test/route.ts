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

export async function POST(request: NextRequest) {
  try {
    const { postUrl } = await request.json();

    if (!postUrl) {
      return NextResponse.json({ error: 'Post URL is required' }, { status: 400 });
    }

    // Validate Instagram URL format
    const instagramPostRegex = /^https:\/\/(www\.)?instagram\.com\/p\/[A-Za-z0-9_-]+\/?$/;
    if (!instagramPostRegex.test(postUrl)) {
      return NextResponse.json({ error: 'Invalid Instagram post URL format' }, { status: 400 });
    }

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
        console.log(`[Instagram API] Attempting to fetch from: ${endpoint}`);

        const response = await fetch(endpoint, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'VersaTalent-Website/1.0',
          },
          // Add timeout to prevent hanging requests
          signal: AbortSignal.timeout(15000) // 15 second timeout
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.warn(`[Instagram API] HTTP ${response.status} from ${endpoint}: ${errorText}`);
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json() as InstagramOEmbedResponse;
        console.log(`[Instagram API] Successfully fetched oEmbed data from ${endpoint}`);

        // Validate the response has required fields
        if (!data.media_id || !data.author_name) {
          throw new Error('Invalid oEmbed response: missing required fields');
        }

        return NextResponse.json({
          success: true,
          data: {
            media_id: data.media_id,
            author_name: data.author_name,
            author_url: data.author_url,
            title: data.title,
            thumbnail_url: data.thumbnail_url,
            html: data.html,
            width: data.width,
            height: data.height,
            provider_name: data.provider_name,
            endpoint_used: endpoint
          }
        });
      } catch (error) {
        console.warn(`[Instagram API] Failed to fetch from ${endpoint}:`, error);
        lastError = error instanceof Error ? error : new Error(String(error));
      }
    }

    // If all endpoints failed
    console.error(`[Instagram API] All endpoints failed for URL: ${postUrl}`);
    return NextResponse.json({
      error: `Failed to fetch Instagram post: ${lastError?.message || 'Unknown error'}`,
      details: 'All oEmbed endpoints failed. The post may be private, deleted, or temporarily unavailable.'
    }, { status: 502 });

  } catch (error) {
    console.error('[Instagram API] Request processing error:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Handle OPTIONS for CORS
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
