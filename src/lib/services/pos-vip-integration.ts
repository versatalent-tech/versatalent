import { createVIPConsumption } from '../db/repositories/vip-consumptions';
import { getUserById } from '../db/repositories/users';
import { MEMBER_ROLES, processConsumption } from './vip-points-service';
import { qualifyReferral } from '../db/repositories/referrals';
import type { POSOrder } from '../db/types';

/**
 * Process VIP points and consumption for a paid POS order
 * This should be called when an order's status changes to 'paid'
 */
export async function processPOSOrderForVIP(order: POSOrder): Promise<{
  success: boolean;
  pointsAwarded?: number;
  consumptionId?: string;
  error?: string;
}> {
  try {
    // Only process if customer is associated with the order
    if (!order.customer_user_id) {
      return {
        success: true, // Not an error, just no VIP to process
        pointsAwarded: 0
      };
    }

    // Points are for VIP members (and artists), as with check-ins; staff or
    // guest cards linked at the till don't earn them
    const customer = await getUserById(order.customer_user_id);
    if (!customer || !MEMBER_ROLES.includes(customer.role)) {
      return { success: true, pointsAwarded: 0 };
    }

    // Points are earned on what was paid, after any member discount
    const amountPaid = order.total_cents / 100;

    // Create consumption record
    const consumption = await createVIPConsumption({
      user_id: order.customer_user_id,
      amount: amountPaid,
      currency: order.currency,
      description: `POS Order #${order.id.slice(0, 8)}`,
      order_id: order.id,
    });

    // Award loyalty points based on consumption
    const pointsResult = await processConsumption(
      order.customer_user_id,
      amountPaid,
      order.currency,
      consumption.id,
      order.id
    );

    // A paid order (above the minimum) can complete the member's referral
    await qualifyReferral(order.customer_user_id, 'order', order.total_cents).catch((error) =>
      console.error('Referral qualification failed:', error)
    );

    return {
      success: true,
      pointsAwarded: pointsResult.pointsAwarded,
      consumptionId: consumption.id
    };

  } catch (error) {
    console.error('Error processing POS order for VIP:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Check if order should award VIP points
 */
export function shouldAwardVIPPoints(order: POSOrder): boolean {
  return (
    order.status === 'paid' &&
    order.customer_user_id !== null &&
    order.customer_user_id !== undefined &&
    order.total_cents > 0
  );
}
