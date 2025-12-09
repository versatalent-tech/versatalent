import { sql } from '../client';
import type { POSOrder, POSOrderItem, POSOrderWithDetails, OrderStatus, CreatePOSOrderRequest } from '../types';
import { getProductsByIds } from './products';

/**
 * Get all orders with optional filters
 */
export async function getAllOrders(options: {
  status?: OrderStatus;
  staffUserId?: string;
  customerUserId?: string;
  limit?: number;
  offset?: number;
} = {}): Promise<POSOrder[]> {
  const { status, staffUserId, customerUserId, limit = 50, offset = 0 } = options;

  let query = 'SELECT * FROM pos_orders WHERE 1=1';
  const params: any[] = [];
  let paramIndex = 1;

  if (status) {
    query += ` AND status = $${paramIndex}`;
    params.push(status);
    paramIndex++;
  }

  if (staffUserId) {
    query += ` AND staff_user_id = $${paramIndex}`;
    params.push(staffUserId);
    paramIndex++;
  }

  if (customerUserId) {
    query += ` AND customer_user_id = $${paramIndex}`;
    params.push(customerUserId);
    paramIndex++;
  }

  query += ` ORDER BY created_at DESC LIMIT ${paramIndex} OFFSET ${paramIndex + 1}`;
  params.push(limit, offset);

  const result = await sql.query(query, params);
  return result.rows as POSOrder[];
}

/**
 * Get order by ID
 */
export async function getOrderById(id: string): Promise<POSOrder | null> {
  const rows = await sql`
    SELECT * FROM pos_orders WHERE id = ${id} LIMIT 1
  `;
  return rows[0] as POSOrder || null;
}

/**
 * Get order with full details (items, users)
 */
export async function getOrderWithDetails(id: string): Promise<POSOrderWithDetails | null> {
  const order = await getOrderById(id);
  if (!order) return null;

  const items = await getOrderItems(id);

  // Fetch user details if needed
  let staff_user = undefined;
  let customer_user = undefined;

  if (order.staff_user_id) {
    const staffRows = await sql`SELECT * FROM users WHERE id = ${order.staff_user_id} LIMIT 1`;
    staff_user = staffRows[0];
  }

  if (order.customer_user_id) {
    const customerRows = await sql`SELECT * FROM users WHERE id = ${order.customer_user_id} LIMIT 1`;
    customer_user = customerRows[0];
  }

  return {
    ...order,
    items,
    staff_user,
    customer_user
  } as POSOrderWithDetails;
}

/**
 * Create a new order
 */
export async function createOrder(data: CreatePOSOrderRequest): Promise<POSOrder> {
  const { staff_user_id, customer_user_id, items, notes } = data;

  // Fetch product details to calculate totals
  const productIds = items.map(item => item.product_id);
  const products = await getProductsByIds(productIds);
  const productMap = new Map(products.map(p => [p.id, p]));

  // Calculate total
  let totalCents = 0;
  const orderItems: Array<{
    product_id: string;
    product_name: string;
    quantity: number;
    unit_price_cents: number;
    line_total_cents: number;
  }> = [];

  for (const item of items) {
    const product = productMap.get(item.product_id);
    if (!product) {
      throw new Error(`Product not found: ${item.product_id}`);
    }

    const lineTotal = product.price_cents * item.quantity;
    totalCents += lineTotal;

    orderItems.push({
      product_id: product.id,
      product_name: product.name,
      quantity: item.quantity,
      unit_price_cents: product.price_cents,
      line_total_cents: lineTotal
    });
  }

  // Create the order
  const orderRows = await sql`
    INSERT INTO pos_orders (
      staff_user_id, customer_user_id, total_cents, currency, status, notes
    ) VALUES (
      ${staff_user_id || null},
      ${customer_user_id || null},
      ${totalCents},
      'EUR',
      'pending',
      ${notes || null}
    )
    RETURNING *
  `;

  const order = orderRows[0] as POSOrder;

  // Create order items
  for (const item of orderItems) {
    await sql`
      INSERT INTO pos_order_items (
        order_id, product_id, product_name, quantity, unit_price_cents, line_total_cents
      ) VALUES (
        ${order.id},
        ${item.product_id},
        ${item.product_name},
        ${item.quantity},
        ${item.unit_price_cents},
        ${item.line_total_cents}
      )
    `;
  }

  return order;
}

/**
 * Update order status
 */
export async function updateOrderStatus(
  id: string,
  status: OrderStatus,
  stripePaymentIntentId?: string
): Promise<POSOrder | null> {
  const rows = await sql`
    UPDATE pos_orders
    SET status = ${status},
        stripe_payment_intent_id = ${stripePaymentIntentId || null},
        updated_at = NOW()
    WHERE id = ${id}
    RETURNING *
  `;

  return rows[0] as POSOrder || null;
}

/**
 * Get order items
 */
export async function getOrderItems(orderId: string): Promise<POSOrderItem[]> {
  const rows = await sql`
    SELECT * FROM pos_order_items
    WHERE order_id = ${orderId}
    ORDER BY created_at
  `;

  return rows as POSOrderItem[];
}

/**
 * Cancel an order
 */
export async function cancelOrder(id: string): Promise<POSOrder | null> {
  return updateOrderStatus(id, 'cancelled');
}

/**
 * Get orders count by status
 */
export async function getOrdersCountByStatus(): Promise<Record<OrderStatus, number>> {
  const rows = await sql`
    SELECT status, COUNT(*)::int as count
    FROM pos_orders
    GROUP BY status
  `;

  const counts: Record<OrderStatus, number> = {
    pending: 0,
    paid: 0,
    cancelled: 0,
    failed: 0
  };

  rows.forEach(row => {
    counts[row.status as OrderStatus] = row.count;
  });

  return counts;
}

/**
 * Get daily sales totals
 */
export async function getDailySalesTotals(days: number = 7): Promise<Array<{
  date: string;
  total_cents: number;
  order_count: number;
}>> {
  const rows = await sql`
    SELECT
      DATE(created_at) as date,
      SUM(total_cents)::int as total_cents,
      COUNT(*)::int as order_count
    FROM pos_orders
    WHERE status = 'paid'
      AND created_at >= NOW() - INTERVAL '${days} days'
    GROUP BY DATE(created_at)
    ORDER BY date DESC
  `;

  return rows as Array<{ date: string; total_cents: number; order_count: number }>;
}
