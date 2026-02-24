import { NextRequest, NextResponse } from 'next/server';
import { createVIPConsumption, getAllVIPConsumptions } from '@/lib/db/repositories/vip-consumptions';
import { processConsumption } from '@/lib/services/vip-points-service';
import type { CreateVIPConsumptionRequest } from '@/lib/db/types';

// GET all consumptions (admin)
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('user_id');

    // If user_id is provided, we'd need to filter (implement if needed)
    const consumptions = await getAllVIPConsumptions();

    return NextResponse.json(consumptions);
  } catch (error) {
    console.error('Error fetching consumptions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch consumptions' },
      { status: 500 }
    );
  }
}

// POST create new consumption and award points
export async function POST(request: NextRequest) {
  try {
    const data: CreateVIPConsumptionRequest = await request.json();

    // Validate required fields
    if (!data.user_id || !data.amount) {
      return NextResponse.json(
        { error: 'Missing required fields: user_id, amount' },
        { status: 400 }
      );
    }

    if (data.amount <= 0) {
      return NextResponse.json(
        { error: 'Amount must be greater than 0' },
        { status: 400 }
      );
    }

    // Create consumption record
    const consumption = await createVIPConsumption(data);

    // Process points award
    const pointsResult = await processConsumption(
      data.user_id,
      data.amount,
      data.currency || 'EUR',
      consumption.id
    );

    return NextResponse.json({
      consumption,
      points: {
        awarded: pointsResult.pointsAwarded,
        new_balance: pointsResult.newBalance,
        new_tier: pointsResult.newTier
      }
    }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating consumption:', error);
    return NextResponse.json(
      { error: 'Failed to create consumption', details: error.message },
      { status: 500 }
    );
  }
}
