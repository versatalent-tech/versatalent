import { NextRequest, NextResponse } from 'next/server';
import {
  getTierBenefitById,
  updateTierBenefit,
  toggleTierBenefit,
  deleteTierBenefit
} from '@/lib/db/repositories/vip-tier-benefits';
import type { UpdateTierBenefitRequest } from '@/lib/db/types';
import { withAdminAuth } from '@/lib/middleware/auth';

// GET single tier benefit
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const benefit = await getTierBenefitById(id);

    if (!benefit) {
      return NextResponse.json(
        { error: 'Tier benefit not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(benefit);
  } catch (error) {
    console.error('Error fetching tier benefit:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tier benefit' },
      { status: 500 }
    );
  }
}

// PUT update tier benefit (admin only)
export const PUT = withAdminAuth(async (
  request: Request,
  context?: { params: Promise<{ id: string }> }
) => {
  try {
    if (!context) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }
    const { id } = await context.params;
    const data: UpdateTierBenefitRequest = await request.json();

    // Validate that at least one field is provided
    if (!data.title && data.description === undefined && data.is_active === undefined) {
      return NextResponse.json(
        { error: 'At least one field must be provided for update' },
        { status: 400 }
      );
    }

    // Validate title if provided
    if (data.title !== undefined && data.title.trim().length === 0) {
      return NextResponse.json(
        { error: 'Title cannot be empty' },
        { status: 400 }
      );
    }

    const benefit = await updateTierBenefit(id, data);

    return NextResponse.json(benefit);
  } catch (error: any) {
    console.error('Error updating tier benefit:', error);

    if (error.message === 'Tier benefit not found') {
      return NextResponse.json(
        { error: 'Tier benefit not found' },
        { status: 404 }
      );
    }

    if (error.message === 'No fields to update') {
      return NextResponse.json(
        { error: 'No fields to update' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to update tier benefit', details: error.message },
      { status: 500 }
    );
  }
});

// PATCH toggle tier benefit active status (admin only)
export const PATCH = withAdminAuth(async (
  request: Request,
  context?: { params: Promise<{ id: string }> }
) => {
  try {
    if (!context) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }
    const { id } = await context.params;
    const benefit = await toggleTierBenefit(id);

    return NextResponse.json(benefit);
  } catch (error: any) {
    console.error('Error toggling tier benefit:', error);

    if (error.message === 'Tier benefit not found') {
      return NextResponse.json(
        { error: 'Tier benefit not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to toggle tier benefit', details: error.message },
      { status: 500 }
    );
  }
});

// DELETE tier benefit (admin only)
export const DELETE = withAdminAuth(async (
  request: Request,
  context?: { params: Promise<{ id: string }> }
) => {
  try {
    if (!context) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }
    const { id } = await context.params;
    const success = await deleteTierBenefit(id);

    if (!success) {
      return NextResponse.json(
        { error: 'Tier benefit not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, message: 'Tier benefit deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting tier benefit:', error);
    return NextResponse.json(
      { error: 'Failed to delete tier benefit', details: error.message },
      { status: 500 }
    );
  }
});
