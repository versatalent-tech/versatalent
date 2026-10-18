import { NextRequest, NextResponse } from 'next/server';
import {
  getOrderById,
  getOrderWithDetails,
  updateOrderStatus,
  cancelOrder
} from '@/lib/db/repositories/pos-orders';
import { completeOrderPayment } from '@/lib/services/pos-payments';
import { withPOSAuth } from '@/lib/auth/pos-auth';

// GET single order with details (requires staff/admin auth)
export const GET = withPOSAuth(async (
  request: NextRequest,
  auth,
  context: { params: Promise<{ id: string }> }
) => {
  try {
    const { id } = await context.params;
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
  context: { params: Promise<{ id: string }> }
) => {
  try {
    const { id } = await context.params;
    const { status, payment_method } = await request.json();

    if (!status) {
      return NextResponse.json(
        { error: 'Status is required' },
        { status: 400 }
      );
    }

    // Card payments are only marked paid after SumUp confirms them
    // (/api/pos/sumup/*). Staff can mark an order paid directly only for cash.
    if (status === 'paid') {
      if (payment_method !== 'cash') {
        return NextResponse.json(
          { error: 'Card payments are confirmed through SumUp. Use payment_method "cash" for cash sales.' },
          { status: 400 }
        );
      }
      const result = await completeOrderPayment(id, { method: 'cash' });
      return NextResponse.json({
        order: result.order,
        loyalty: { pointsAwarded: result.pointsAwarded }
      });
    }

    // A paid order is undone by a refund, which also takes back its points
    const current = await getOrderById(id);
    if (current?.status === 'paid' || status === 'refunded') {
      return NextResponse.json(
        { error: 'Paid orders are refunded from Admin → Till orders, which also takes back the points.' },
        { status: 400 }
      );
    }

    const order = await updateOrderStatus(id, status);

    if (!order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
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
  context: { params: Promise<{ id: string }> }
) => {
  try {
    const { id } = await context.params;
    const current = await getOrderById(id);
    if (current?.status === 'paid') {
      return NextResponse.json(
        { error: 'Paid orders are refunded from Admin → Till orders, which also takes back the points.' },
        { status: 400 }
      );
    }
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
