import { sql, query } from '../client';
import type { POSOrder, POSOrderItem, POSOrderWithDetails, OrderStatus, CreatePOSOrderRequest, PaymentMethod, VIPTier } from '../types';
import { getProductsByIds } from './products';
import { checkStockAvailability, deductStockForOrder, restoreStockForOrder } from './inventory';
import { POS_CURRENCY } from '@/lib/utils/formatting';

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

  let queryText = 'SELECT * FROM pos_orders WHERE 1=1';
  const params: any[] = [];
  let paramIndex = 1;

  if (status) {
    queryText += ` AND status = $${paramIndex}`;
    params.push(status);
    paramIndex++;
  }

  if (staffUserId) {
    queryText += ` AND staff_user_id = $${paramIndex}`;
    params.push(staffUserId);
    paramIndex++;
  }

  if (customerUserId) {
    queryText += ` AND customer_user_id = $${paramIndex}`;
    params.push(customerUserId);
    paramIndex++;
  }

  queryText += ` ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
  params.push(limit, offset);

  const result = await query(queryText, params);
  return result as POSOrder[];
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
 * Mark a pending order as paid. The status check makes this a one-time
 * transition: concurrent or repeated calls (webhook retries, double clicks)
 * get transitioned = false, so callers only award VIP points once.
 */
export async function markOrderPaid(
  id: string,
  payment: {
    method: PaymentMethod;
    sumupTransactionCode?: string | null;
  }
): Promise<{ order: POSOrder | null; transitioned: boolean }> {
  const rows = await sql`
    UPDATE pos_orders
    SET status = 'paid',
        payment_method = ${payment.method},
        sumup_transaction_code = COALESCE(${payment.sumupTransactionCode ?? null}, sumup_transaction_code)
    WHERE id = ${id} AND status = 'pending'
    RETURNING *
  `;
  if (rows.length > 0) {
    return { order: rows[0] as POSOrder, transitioned: true };
  }
  return { order: await getOrderById(id), transitioned: false };
}

/**
 * Record the SumUp client transaction id of a checkout sent to a reader
 */
export async function setOrderSumUpCheckout(id: string, clientTransactionId: string): Promise<void> {
  await sql`
    UPDATE pos_orders
    SET sumup_client_transaction_id = ${clientTransactionId}
    WHERE id = ${id} AND status = 'pending'
  `;
}

export async function getOrderBySumUpClientTransactionId(clientTransactionId: string): Promise<POSOrder | null> {
  const rows = await sql`
    SELECT * FROM pos_orders WHERE sumup_client_transaction_id = ${clientTransactionId} LIMIT 1
  `;
  return (rows[0] as POSOrder) || null;
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
 * Create a new order. With a member discount, the discount applies to every
 * item not excluded from member discounts, and total_cents is the amount to
 * charge.
 */
export async function createOrder(
  data: CreatePOSOrderRequest,
  memberDiscount?: { tier: VIPTier; percent: number } | null
): Promise<POSOrder> {
  const { staff_user_id, customer_user_id, items, notes } = data;

  // Check stock availability BEFORE creating the order
  const stockCheck = await checkStockAvailability(items);
  if (!stockCheck.available) {
    const insufficientItems = stockCheck.insufficientItems || [];
    const itemsList = insufficientItems
      .map(item => `${item.product_name} (need ${item.required}, have ${item.available})`)
      .join(', ');
    throw new Error(`Insufficient stock: ${itemsList}`);
  }

  // Fetch product details to calculate totals
  const productIds = items.map(item => item.product_id);
  const products = await getProductsByIds(productIds);
  const productMap = new Map(products.map(p => [p.id, p]));

  // Calculate totals
  let subtotalCents = 0;
  let discountableCents = 0;
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
    subtotalCents += lineTotal;
    if (!product.member_discount_excluded) {
      discountableCents += lineTotal;
    }

    orderItems.push({
      product_id: product.id,
      product_name: product.name,
      quantity: item.quantity,
      unit_price_cents: product.price_cents,
      line_total_cents: lineTotal
    });
  }

  const discountPercent = customer_user_id && memberDiscount ? memberDiscount.percent : 0;
  const discountCents = Math.round((discountableCents * discountPercent) / 100);
  const totalCents = subtotalCents - discountCents;

  // Create the order
  const orderRows = await sql`
    INSERT INTO pos_orders (
      staff_user_id, customer_user_id, subtotal_cents, discount_cents, discount_percent,
      discount_tier, total_cents, currency, status, notes
    ) VALUES (
      ${staff_user_id || null},
      ${customer_user_id || null},
      ${subtotalCents},
      ${discountCents},
      ${discountPercent},
      ${discountCents > 0 ? memberDiscount!.tier : null},
      ${totalCents},
      ${POS_CURRENCY},
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

  // Deduct stock immediately after order creation
  // This creates an inventory movement record and updates product stock
  try {
    await deductStockForOrder(order.id, items, staff_user_id || undefined);
  } catch (error) {
    // If stock deduction fails, log the error but don't fail the order
    // The order is already created, so we just log for manual intervention
    console.error('Failed to deduct stock for order:', order.id, error);
    // You could add a flag to the order to indicate manual stock adjustment needed
  }

  return order;
}

/**
 * Update order status
 */
export async function updateOrderStatus(
  id: string,
  status: OrderStatus
): Promise<POSOrder | null> {
  // Get the current order to check previous status
  const currentOrder = await getOrderById(id);
  if (!currentOrder) {
    throw new Error('Order not found');
  }

  const rows = await sql`
    UPDATE pos_orders
    SET status = ${status},
        updated_at = NOW()
    WHERE id = ${id}
    RETURNING *
  `;

  const updatedOrder = rows[0] as POSOrder || null;

  // Restore stock if order is cancelled
  // Only restore if the previous status was 'pending' or 'paid' (meaning stock was deducted)
  if (updatedOrder && status === 'cancelled') {
    if (currentOrder.status === 'pending' || currentOrder.status === 'paid') {
      try {
        // Get order items to restore stock
        const items = await getOrderItems(id);
        const itemsToRestore = items.map(item => ({
          product_id: item.product_id || '',
          quantity: item.quantity
        }));

        await restoreStockForOrder(id, itemsToRestore, currentOrder.staff_user_id || undefined);
      } catch (error) {
        console.error('Failed to restore stock for cancelled/refunded order:', id, error);
        // Don't fail the status update, just log for manual intervention
      }
    }
  }

  return updatedOrder;
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
    failed: 0,
    refunded: 0
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
