import { NextRequest, NextResponse } from 'next/server';
import {
  getAllOrders,
  createOrder,
  getOrdersCountByStatus
} from '@/lib/db/repositories/pos-orders';
import type { CreatePOSOrderRequest, OrderStatus } from '@/lib/db/types';
import { withPOSAuth } from '@/lib/auth/pos-auth';

// GET all orders with optional filters (requires staff/admin auth)
export const GET = withPOSAuth(async (request: NextRequest) => {
  try {
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status') as OrderStatus | null;
    const staffUserId = searchParams.get('staffUserId');
    const customerUserId = searchParams.get('customerUserId');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const counts = searchParams.get('counts') === 'true';

    // Return status counts
    if (counts) {
      const statusCounts = await getOrdersCountByStatus();
      return NextResponse.json(statusCounts);
    }

    // Return orders
    const orders = await getAllOrders({
      status: status || undefined,
      staffUserId: staffUserId || undefined,
      customerUserId: customerUserId || undefined,
      limit,
      offset
    });

    return NextResponse.json(orders);
  } catch (error) {
    console.error('Error fetching orders:', error);
    return NextResponse.json(
      { error: 'Failed to fetch orders' },
      { status: 500 }
    );
  }
});

// POST - Create new order (requires staff/admin auth)
export const POST = withPOSAuth(async (request: NextRequest) => {
  try {
    const data: CreatePOSOrderRequest = await request.json();

    // Validate required fields
    if (!data.items || data.items.length === 0) {
      return NextResponse.json(
        { error: 'Order must have at least one item' },
        { status: 400 }
      );
    }

    // Validate items
    for (const item of data.items) {
      if (!item.product_id || item.quantity <= 0) {
        return NextResponse.json(
          { error: 'Invalid item: product_id and positive quantity required' },
          { status: 400 }
        );
      }
    }

    const order = await createOrder(data);

    return NextResponse.json(order, { status: 201 });
  } catch (error: any) {
    console.error('Error creating order:', error);
    return NextResponse.json(
      { error: 'Failed to create order', details: error.message },
      { status: 500 }
    );
  }
});
