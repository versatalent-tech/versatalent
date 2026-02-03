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
import { successResponse, ApiErrors, logApiError } from '@/lib/utils/api-response';
import { Validator, isValidIndustry } from '@/lib/utils/validation';
import { withAdminAuth } from '@/lib/middleware/auth';
import type { CreateTalentRequest, Industry } from '@/lib/db/types';

/**
 * GET /api/talents
 * Fetch talents with optional filters
 * Query params:
 * - industry: Filter by industry (optional)
 * - featured: true to get only featured talents (optional)
 * - q: Search query (optional)
 * - activeOnly: false to include inactive talents (default: true)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const industry = searchParams.get('industry') as Industry | null;
    const featured = searchParams.get('featured');
    const searchQuery = searchParams.get('q');
    const activeOnly = searchParams.get('activeOnly') !== 'false'; // Default to true

    // Cache headers for better performance
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

    // Get all talents
    const talents = await getAllTalents({
      industry: industry || undefined,
      activeOnly: activeOnly
    });

    return NextResponse.json(talents, { headers });
  } catch (error) {
    logApiError('/api/talents [GET]', error, { query: request.nextUrl.search });
    return ApiErrors.ServerError('Failed to fetch talents');
  }
}

/**
 * POST /api/talents
 * Create new talent with user account (admin only)
 *
 * Creates both a talent profile and a linked user account for dashboard access
 */
export const POST = withAdminAuth(async (request: Request) => {
  try {
    const data: CreateTalentRequest = await request.json();

    // Validate required fields using new Validator
    const validator = new Validator(data as Record<string, unknown>)
      .required('name', 'Talent name is required')
      .required('industry', 'Industry is required')
      .required('profession', 'Profession is required')
      .required('bio', 'Bio is required')
      .custom('industry', (val) => isValidIndustry(String(val)), 'Invalid industry type');

    const validation = validator.validate();
    if (!validation.valid) {
      return ApiErrors.ValidationError(validation.errors);
    }

    // Create the talent profile
    const talent = await createTalent(validation.data as CreateTalentRequest);

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

      // Return success with credentials
      return successResponse(
        {
          talent,
          user: {
            id: user.id,
            email: user.email,
            password: defaultPassword, // Include password for admin to share
            role: user.role,
          },
        },
        'Talent profile and user account created successfully. Please save these credentials and share with the talent.',
        201
      );

    } catch (userError: unknown) {
      // If user creation fails, still return the talent but with a warning
      logApiError('/api/talents [POST] - User creation failed', userError, {
        talentId: talent.id,
        talentName: data.name,
      });

      const errorMessage = userError instanceof Error ? userError.message : 'Unknown error';

      return successResponse(
        {
          talent,
          user: null,
        },
        `Talent created but user account creation failed: ${errorMessage}. You may need to create the user account manually.`,
        201
      );
    }

  } catch (error) {
    logApiError('/api/talents [POST]', error);

    if (error instanceof Error) {
      return ApiErrors.ServerError(error.message);
    }

    return ApiErrors.ServerError('Failed to create talent');
  }
});
