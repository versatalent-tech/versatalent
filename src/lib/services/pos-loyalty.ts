import { sql } from '@/lib/db/client';
import type { POSOrder, VIPMembership, VIPPointRule } from '@/lib/db/types';

/**
 * Process loyalty points for a paid POS order
 * This integrates with the existing VIP system
 */
export async function awardLoyaltyPointsForOrder(
  order: POSOrder
): Promise<{
  success: boolean;
  pointsAwarded?: number;
  newBalance?: number;
  error?: string;
}> {
  try {
    // Only process if customer is linked to the order
    if (!order.customer_user_id) {
      return { success: true, pointsAwarded: 0 };
    }

    // Only process paid orders
    if (order.status !== 'paid') {
      return {
        success: false,
        error: 'Order must be paid before awarding points'
      };
    }

    // Check if points already awarded (idempotency check)
    const existingPoints = await sql`
      SELECT id FROM vip_points_log
      WHERE user_id = ${order.customer_user_id}
      AND source = 'consumption_pos'
      AND ref_id = ${order.id}
      LIMIT 1
    `;

    if (existingPoints.length > 0) {
      return {
        success: true,
        pointsAwarded: 0
      };
    }

    // Get VIP membership
    const memberships = await sql`
      SELECT * FROM vip_memberships
      WHERE user_id = ${order.customer_user_id}
      AND status = 'active'
      LIMIT 1
    `;

    if (memberships.length === 0) {
      return {
        success: false,
        error: 'No active VIP membership found'
      };
    }

    const membership = memberships[0] as VIPMembership;

    // Get points rule for POS consumption
    // Look for action_type = 'consumption' or 'pos_consumption'
    const rules = await sql`
      SELECT * FROM vip_point_rules
      WHERE (action_type = 'consumption' OR action_type = 'pos_consumption')
      AND is_active = true
      ORDER BY points_per_unit DESC
      LIMIT 1
    `;

    let pointsPerEuro = 1; // Default: 1 point per euro
    if (rules.length > 0) {
      const rule = rules[0] as VIPPointRule;
      pointsPerEuro = rule.points_per_unit;
    }

    // Calculate points
    // Convert cents to euros and apply points rule
    const amountInEuros = order.total_cents / 100;
    const pointsToAward = Math.floor(amountInEuros * pointsPerEuro);

    if (pointsToAward <= 0) {
      return {
        success: true,
        pointsAwarded: 0
      };
    }

    // Record consumption
    await sql`
      INSERT INTO vip_consumptions (
        user_id, amount, currency, description, source
      ) VALUES (
        ${order.customer_user_id},
        ${order.total_cents / 100},
        ${order.currency},
        ${'POS Order #' + order.id.slice(0, 8)},
        'pos'
      )
    `;

    // Update VIP membership points
    const newBalance = membership.points_balance + pointsToAward;
    const newLifetimePoints = membership.lifetime_points + pointsToAward;

    await sql`
      UPDATE vip_memberships
      SET
        points_balance = ${newBalance},
        lifetime_points = ${newLifetimePoints},
        updated_at = NOW()
      WHERE user_id = ${order.customer_user_id}
    `;

    // Log points transaction
    await sql`
      INSERT INTO vip_points_log (
        user_id, source, ref_id, delta_points, balance_after, metadata
      ) VALUES (
        ${order.customer_user_id},
        'consumption_pos',
        ${order.id},
        ${pointsToAward},
        ${newBalance},
        ${JSON.stringify({
          order_total: order.total_cents,
          currency: order.currency,
          points_rule: pointsPerEuro
        })}
      )
    `;

    return {
      success: true,
      pointsAwarded: pointsToAward,
      newBalance
    };

  } catch (error: unknown) {
    console.error('Error awarding loyalty points:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to award points';
    return {
      success: false,
      error: errorMessage
    };
  }
}

/**
 * Reverse loyalty points for a refunded/cancelled order
 */
export async function reverseLoyaltyPointsForOrder(
  order: POSOrder
): Promise<{
  success: boolean;
  pointsReversed?: number;
  error?: string;
}> {
  try {
    if (!order.customer_user_id) {
      return { success: true, pointsReversed: 0 };
    }

    // Find the original points award
    const pointsLogs = await sql`
      SELECT * FROM vip_points_log
      WHERE user_id = ${order.customer_user_id}
      AND source = 'consumption_pos'
      AND ref_id = ${order.id}
      LIMIT 1
    `;

    if (pointsLogs.length === 0) {
      return { success: true, pointsReversed: 0 };
    }

    const pointsLog = pointsLogs[0];
    const pointsToReverse = pointsLog.delta_points;

    // Get current VIP membership
    const memberships = await sql`
      SELECT * FROM vip_memberships
      WHERE user_id = ${order.customer_user_id}
      LIMIT 1
    `;

    if (memberships.length === 0) {
      return {
        success: false,
        error: 'VIP membership not found'
      };
    }

    const membership = memberships[0] as VIPMembership;

    // Deduct points
    const newBalance = Math.max(0, membership.points_balance - pointsToReverse);

    await sql`
      UPDATE vip_memberships
      SET points_balance = ${newBalance}, updated_at = NOW()
      WHERE user_id = ${order.customer_user_id}
    `;

    // Log reversal
    await sql`
      INSERT INTO vip_points_log (
        user_id, source, ref_id, delta_points, balance_after, metadata
      ) VALUES (
        ${order.customer_user_id},
        'manual_adjust',
        ${order.id},
        ${-pointsToReverse},
        ${newBalance},
        ${JSON.stringify({
          reason: 'Order refund/cancellation',
          original_points: pointsToReverse
        })}
      )
    `;

    return {
      success: true,
      pointsReversed: pointsToReverse
    };

  } catch (error: unknown) {
    console.error('Error reversing loyalty points:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to reverse points';
    return {
      success: false,
      error: errorMessage
    };
  }
}
