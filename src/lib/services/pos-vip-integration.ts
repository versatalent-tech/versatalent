import { createVIPConsumption } from '../db/repositories/vip-consumptions';
import { processConsumption } from './vip-points-service';
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

    // Convert cents to euros for consumption tracking
    const amountInEuros = order.total_cents / 100;

    // Create consumption record
    const consumption = await createVIPConsumption({
      user_id: order.customer_user_id,
      amount: amountInEuros,
      currency: order.currency,
      description: `POS Order #${order.id.slice(0, 8)}`
    });

    // Award loyalty points based on consumption
    const pointsResult = await processConsumption(
      order.customer_user_id,
      amountInEuros,
      order.currency,
      consumption.id
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
