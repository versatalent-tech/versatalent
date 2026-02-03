import { NextRequest, NextResponse } from 'next/server';
import {
  getOrderWithDetails,
  updateOrderStatus,
  cancelOrder
} from '@/lib/db/repositories/pos-orders';
import { processPOSOrderForVIP } from '@/lib/services/pos-vip-integration';
import { withPOSAuth } from '@/lib/auth/pos-auth';

// GET single order with details (requires staff/admin auth)
export const GET = withPOSAuth(async (
  request: NextRequest,
  auth,
  context: { params: { id: string } }
) => {
  try {
    const { id } = context.params;
    const order = await getOrderWithDetails(id);

    if (!order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(order);
  } catch (error) {
    console.error('Error fetching order:', error);
    return NextResponse.json(
      { error: 'Failed to fetch order' },
      { status: 500 }
    );
  }
});

// PUT - Update order status (requires staff/admin auth)
export const PUT = withPOSAuth(async (
  request: NextRequest,
  auth,
  context: { params: { id: string } }
) => {
  try {
    const { id } = context.params;
    const { status, stripe_payment_intent_id } = await request.json();

    if (!status) {
      return NextResponse.json(
        { error: 'Status is required' },
        { status: 400 }
      );
    }

    const order = await updateOrderStatus(id, status, stripe_payment_intent_id);

    if (!order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    // If order is paid and has a customer, award VIP points
    if (status === 'paid' && order.customer_user_id) {
      const vipResult = await processPOSOrderForVIP(order);

      return NextResponse.json({
        order,
        loyalty: vipResult.success ? {
          pointsAwarded: vipResult.pointsAwarded,
          consumptionId: vipResult.consumptionId
        } : null
      });
    }

    return NextResponse.json({ order });
  } catch (error: any) {
    console.error('Error updating order:', error);
    return NextResponse.json(
      { error: 'Failed to update order', details: error.message },
      { status: 500 }
    );
  }
});

// DELETE - Cancel order (requires staff/admin auth)
export const DELETE = withPOSAuth(async (
  request: NextRequest,
  auth,
  context: { params: { id: string } }
) => {
  try {
    const { id } = context.params;
    const order = await cancelOrder(id);

    if (!order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ order });
  } catch (error: any) {
    console.error('Error cancelling order:', error);
    return NextResponse.json(
      { error: 'Failed to cancel order', details: error.message },
      { status: 500 }
    );
  }
});
