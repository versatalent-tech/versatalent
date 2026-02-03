import { NextRequest, NextResponse } from 'next/server';
import {
  getAllTierBenefits,
  getBenefitsByTier,
  createTierBenefit,
  getBenefitsCountByTier
} from '@/lib/db/repositories/vip-tier-benefits';
import type { CreateTierBenefitRequest, VIPTier } from '@/lib/db/types';
import { withAdminAuth } from '@/lib/middleware/auth';

// GET all tier benefits (with optional tier filter)
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const tier = searchParams.get('tier') as VIPTier | null;
    const activeOnly = searchParams.get('active_only') !== 'false';

    if (tier) {
      // Validate tier
      if (!['silver', 'gold', 'black'].includes(tier)) {
        return NextResponse.json(
          { error: 'Invalid tier. Must be silver, gold, or black' },
          { status: 400 }
        );
      }

      const benefits = await getBenefitsByTier(tier, activeOnly);
      return NextResponse.json(benefits);
    }

    const benefits = await getAllTierBenefits();
    return NextResponse.json(benefits);
  } catch (error) {
    console.error('Error fetching tier benefits:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tier benefits' },
      { status: 500 }
    );
  }
}

// POST create new tier benefit (admin only)
export const POST = withAdminAuth(async (request: Request) => {
  try {
    const data: CreateTierBenefitRequest = await request.json();

    // Validate required fields
    if (!data.tier_name || !data.title) {
      return NextResponse.json(
        { error: 'Missing required fields: tier_name, title' },
        { status: 400 }
      );
    }

    // Validate tier name
    if (!['silver', 'gold', 'black'].includes(data.tier_name)) {
      return NextResponse.json(
        { error: 'Invalid tier_name. Must be silver, gold, or black' },
        { status: 400 }
      );
    }

    // Validate title length
    if (data.title.trim().length === 0) {
      return NextResponse.json(
        { error: 'Title cannot be empty' },
        { status: 400 }
      );
    }

    const benefit = await createTierBenefit(data);

    return NextResponse.json(benefit, { status: 201 });
  } catch (error: any) {
    console.error('Error creating tier benefit:', error);
    return NextResponse.json(
      { error: 'Failed to create tier benefit', details: error.message },
      { status: 500 }
    );
  }
});
