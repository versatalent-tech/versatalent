import { NextRequest, NextResponse } from 'next/server';
import {
  getAllTalents,
  getFeaturedTalents,
  getTalentsByIndustry,
  createTalent,
  searchTalents
} from '@/lib/db/repositories/talents';
import { createUser } from '@/lib/db/repositories/users';
import { generateSecurePassword, generateDefaultEmail } from '@/lib/utils';
import type { CreateTalentRequest, Industry } from '@/lib/db/types';

// GET all talents with optional filters
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const industry = searchParams.get('industry') as Industry | null;
    const featured = searchParams.get('featured');
    const searchQuery = searchParams.get('q');
    const activeOnly = searchParams.get('activeOnly') !== 'false'; // Default to true

    // Add cache headers for better performance
    const headers = {
      'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=30',
    };

    // Handle search query
    if (searchQuery) {
      const talents = await searchTalents(searchQuery);
      return NextResponse.json(talents, { headers });
    }

    // Handle featured filter
    if (featured === 'true') {
      const talents = await getFeaturedTalents();
      return NextResponse.json(talents, { headers });
    }

    // Handle industry filter
    if (industry) {
      const talents = await getTalentsByIndustry(industry);
      return NextResponse.json(talents, { headers });
    }

    // Get all talents with activeOnly filter
    const talents = await getAllTalents({
      industry: industry || undefined,
      activeOnly: activeOnly
    });

    return NextResponse.json(talents, { headers });
  } catch (error) {
    console.error('Error fetching talents:', error);
    return NextResponse.json(
      { error: 'Failed to fetch talents' },
      { status: 500 }
    );
  }
}

// POST - Create new talent with user account (admin only - add auth later)
export async function POST(request: NextRequest) {
  try {
    const data: CreateTalentRequest = await request.json();

    // Validate required fields
    if (!data.name || !data.industry || !data.profession || !data.bio) {
      return NextResponse.json(
        { error: 'Missing required fields: name, industry, profession, bio' },
        { status: 400 }
      );
    }

    // Validate industry type
    const validIndustries = ['acting', 'modeling', 'music', 'culinary', 'sports'];
    if (!validIndustries.includes(data.industry)) {
      return NextResponse.json(
        { error: 'Invalid industry type' },
        { status: 400 }
      );
    }

    // Create the talent first
    const talent = await createTalent(data);

    // Generate user credentials for the talent
    const defaultPassword = generateSecurePassword(12);
    const defaultEmail = generateDefaultEmail(data.name);

    try {
      // Create a user account linked to this talent
      const user = await createUser({
        name: data.name,
        email: defaultEmail,
        password: defaultPassword,
        role: 'artist',
        avatar_url: data.image_src,
        talent_id: talent.id,
      });

      // Return the talent along with user credentials
      return NextResponse.json({
        talent,
        user: {
          id: user.id,
          email: user.email,
          password: defaultPassword, // Include password in response for admin to share
          role: user.role,
        },
        message: 'Talent profile and user account created successfully. Please save these credentials and share with the talent.',
      }, { status: 201 });

    } catch (userError: any) {
      // If user creation fails (e.g., email already exists), still return the talent
      // but notify admin about the user creation failure
      console.error('Error creating user account for talent:', userError);

      return NextResponse.json({
        talent,
        user: null,
        warning: `Talent created but user account creation failed: ${userError.message}. You may need to create the user account manually.`,
      }, { status: 201 });
    }

  } catch (error: any) {
    console.error('Error creating talent:', error);
    return NextResponse.json(
      { error: 'Failed to create talent', details: error.message },
      { status: 500 }
    );
  }
}
