import { NextRequest, NextResponse } from 'next/server';
import {
  getUserPurchaseHistory,
  getUserPurchaseStats
} from '@/lib/db/repositories/purchase-history';

/**
 * GET /api/admin/users/[id]/purchases
 * Get complete purchase history for a user
 * Includes all orders, items, and statistics
 * Admin only
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: userId } = await params;

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(userId)) {
      return NextResponse.json(
        { error: 'Invalid user ID format' },
        { status: 400 }
      );
    }

    // Get purchase history
    const purchaseHistory = await getUserPurchaseHistory(userId);

    if (!purchaseHistory) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Get purchase statistics
    const stats = await getUserPurchaseStats(userId);

    return NextResponse.json({
      ...purchaseHistory,
      stats,
    });

  } catch (error: any) {
    console.error('Error fetching purchase history:', error);

    return NextResponse.json(
      {
        error: 'Failed to fetch purchase history',
        details: error.message
      },
      { status: 500 }
    );
  }
}
