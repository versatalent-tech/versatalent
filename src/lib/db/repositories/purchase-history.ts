import { sql } from '../client';
import type {
  UserPurchaseHistory,
  PurchaseHistoryOrder,
  PurchaseHistoryItem,
  PurchaseHistoryStats
} from '../types';

/**
 * Get complete purchase history for a user
 * @param userId - User ID to get purchase history for
 * @returns Complete purchase history with orders and items
 */
export async function getUserPurchaseHistory(
  userId: string
): Promise<UserPurchaseHistory | null> {
  try {
    // Get user details
    const userRows = await sql`
      SELECT id, name, email, stripe_customer_id
      FROM users
      WHERE id = ${userId}
      LIMIT 1
    `;

    if (userRows.length === 0) {
      return null;
    }

    const user = userRows[0];

    // Get all paid orders for this user with items
    const ordersResult = await sql`
      SELECT
        o.id,
        o.created_at as order_date,
        o.total_cents,
        o.currency,
        o.status,
        o.stripe_payment_intent_id,
        o.notes,
        o.staff_user_id,
        u.name as staff_name,
        json_agg(
          json_build_object(
            'id', i.id,
            'product_id', i.product_id,
            'product_name', i.product_name,
            'quantity', i.quantity,
            'unit_price_cents', i.unit_price_cents,
            'line_total_cents', i.line_total_cents
          ) ORDER BY i.created_at
        ) as items
      FROM pos_orders o
      LEFT JOIN pos_order_items i ON i.order_id = o.id
      LEFT JOIN users u ON u.id = o.staff_user_id
      WHERE o.customer_user_id = ${userId}
        AND o.status = 'paid'
      GROUP BY o.id, o.created_at, o.total_cents, o.currency,
               o.status, o.stripe_payment_intent_id, o.notes,
               o.staff_user_id, u.name
      ORDER BY o.created_at DESC
    `;

    // Calculate totals
    const totalOrders = ordersResult.length;
    const totalSpentCents = ordersResult.reduce(
      (sum: number, order: any) => sum + order.total_cents,
      0
    );

    const orders: PurchaseHistoryOrder[] = ordersResult.map((order: any) => ({
      id: order.id,
      order_date: order.order_date,
      total_cents: order.total_cents,
      currency: order.currency,
      status: order.status,
      stripe_payment_intent_id: order.stripe_payment_intent_id,
      items: order.items as PurchaseHistoryItem[],
      notes: order.notes,
      staff_user: order.staff_user_id
        ? {
            id: order.staff_user_id,
            name: order.staff_name,
          }
        : undefined,
    }));

    return {
      user_id: user.id,
      user_name: user.name,
      user_email: user.email,
      stripe_customer_id: user.stripe_customer_id,
      total_orders: totalOrders,
      total_spent_cents: totalSpentCents,
      currency: ordersResult[0]?.currency || 'EUR',
      orders,
    };
  } catch (error) {
    console.error('Error fetching user purchase history:', error);
    throw error;
  }
}

/**
 * Get purchase history statistics for a user
 * @param userId - User ID
 * @returns Purchase statistics
 */
export async function getUserPurchaseStats(
  userId: string
): Promise<PurchaseHistoryStats | null> {
  try {
    // Get order stats
    const statsResult = await sql`
      SELECT
        COUNT(DISTINCT o.id) as total_orders,
        COUNT(i.id) as total_items_purchased,
        COALESCE(SUM(o.total_cents), 0) as total_spent_cents,
        COALESCE(AVG(o.total_cents), 0) as average_order_value_cents,
        MIN(o.created_at) as first_purchase_date,
        MAX(o.created_at) as last_purchase_date
      FROM pos_orders o
      LEFT JOIN pos_order_items i ON i.order_id = o.id
      WHERE o.customer_user_id = ${userId}
        AND o.status = 'paid'
    `;

    if (statsResult.length === 0) {
      return null;
    }

    const stats = statsResult[0];

    // Get most purchased items
    const topItemsResult = await sql`
      SELECT
        i.product_name,
        SUM(i.quantity) as total_quantity,
        SUM(i.line_total_cents) as total_spent_cents
      FROM pos_order_items i
      JOIN pos_orders o ON o.id = i.order_id
      WHERE o.customer_user_id = ${userId}
        AND o.status = 'paid'
      GROUP BY i.product_name
      ORDER BY total_quantity DESC
      LIMIT 5
    `;

    return {
      total_orders: Number(stats.total_orders),
      total_items_purchased: Number(stats.total_items_purchased),
      total_spent_cents: Number(stats.total_spent_cents),
      average_order_value_cents: Number(stats.average_order_value_cents),
      most_purchased_items: topItemsResult.map((item: any) => ({
        product_name: item.product_name,
        total_quantity: Number(item.total_quantity),
        total_spent_cents: Number(item.total_spent_cents),
      })),
      first_purchase_date: stats.first_purchase_date,
      last_purchase_date: stats.last_purchase_date,
    };
  } catch (error) {
    console.error('Error fetching user purchase stats:', error);
    throw error;
  }
}

/**
 * Get purchase history for a specific date range
 * @param userId - User ID
 * @param startDate - Start date
 * @param endDate - End date
 * @returns Purchase history for the date range
 */
export async function getUserPurchaseHistoryByDateRange(
  userId: string,
  startDate: Date,
  endDate: Date
): Promise<PurchaseHistoryOrder[]> {
  try {
    const ordersResult = await sql`
      SELECT
        o.id,
        o.created_at as order_date,
        o.total_cents,
        o.currency,
        o.status,
        o.stripe_payment_intent_id,
        o.notes,
        o.staff_user_id,
        u.name as staff_name,
        json_agg(
          json_build_object(
            'id', i.id,
            'product_id', i.product_id,
            'product_name', i.product_name,
            'quantity', i.quantity,
            'unit_price_cents', i.unit_price_cents,
            'line_total_cents', i.line_total_cents
          ) ORDER BY i.created_at
        ) as items
      FROM pos_orders o
      LEFT JOIN pos_order_items i ON i.order_id = o.id
      LEFT JOIN users u ON u.id = o.staff_user_id
      WHERE o.customer_user_id = ${userId}
        AND o.status = 'paid'
        AND o.created_at >= ${startDate.toISOString()}
        AND o.created_at <= ${endDate.toISOString()}
      GROUP BY o.id, o.created_at, o.total_cents, o.currency,
               o.status, o.stripe_payment_intent_id, o.notes,
               o.staff_user_id, u.name
      ORDER BY o.created_at DESC
    `;

    return ordersResult.map((order: any) => ({
      id: order.id,
      order_date: order.order_date,
      total_cents: order.total_cents,
      currency: order.currency,
      status: order.status,
      stripe_payment_intent_id: order.stripe_payment_intent_id,
      items: order.items as PurchaseHistoryItem[],
      notes: order.notes,
      staff_user: order.staff_user_id
        ? {
            id: order.staff_user_id,
            name: order.staff_name,
          }
        : undefined,
    }));
  } catch (error) {
    console.error('Error fetching purchase history by date range:', error);
    throw error;
  }
}
