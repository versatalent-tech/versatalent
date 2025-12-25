import { sql } from '../client';
import type {
  InventoryMovement,
  InventoryMovementWithDetails,
  CreateInventoryMovementRequest,
  Product
} from '../types';

/**
 * Record an inventory movement
 */
export async function createInventoryMovement(
  data: CreateInventoryMovementRequest
): Promise<InventoryMovement> {
  const {
    product_id,
    change_amount,
    reason,
    related_order_id,
    staff_user_id,
    notes
  } = data;

  const rows = await sql`
    INSERT INTO inventory_movements (
      product_id, change_amount, reason, related_order_id, staff_user_id, notes
    ) VALUES (
      ${product_id},
      ${change_amount},
      ${reason},
      ${related_order_id || null},
      ${staff_user_id || null},
      ${notes || null}
    )
    RETURNING *
  `;

  return rows[0] as InventoryMovement;
}

/**
 * Update product stock and record movement
 * This is a transactional operation
 */
export async function updateProductStock(
  product_id: string,
  change_amount: number,
  reason: CreateInventoryMovementRequest['reason'],
  staff_user_id?: string,
  related_order_id?: string,
  notes?: string
): Promise<{ product: Product; movement: InventoryMovement }> {
  // Get current stock
  const products = await sql`
    SELECT * FROM products WHERE id = ${product_id} LIMIT 1
  `;

  if (products.length === 0) {
    throw new Error('Product not found');
  }

  const product = products[0] as Product;
  const newStock = product.stock_quantity + change_amount;

  // Prevent negative stock
  if (newStock < 0) {
    throw new Error(
      `Insufficient stock. Available: ${product.stock_quantity}, Required: ${Math.abs(change_amount)}`
    );
  }

  // Update stock
  const updatedProducts = await sql`
    UPDATE products
    SET stock_quantity = ${newStock}, updated_at = NOW()
    WHERE id = ${product_id}
    RETURNING *
  `;

  // Record movement
  const movement = await createInventoryMovement({
    product_id,
    change_amount,
    reason,
    related_order_id,
    staff_user_id,
    notes
  });

  return {
    product: updatedProducts[0] as Product,
    movement
  };
}

/**
 * Process stock deduction for a POS order
 * This handles multiple items in a single transaction
 */
export async function deductStockForOrder(
  order_id: string,
  items: Array<{ product_id: string; quantity: number }>,
  staff_user_id?: string
): Promise<void> {
  for (const item of items) {
    await updateProductStock(
      item.product_id,
      -item.quantity, // Negative for deduction
      'pos_sale',
      staff_user_id,
      order_id,
      `POS sale - Order ${order_id.slice(0, 8)}`
    );
  }
}

/**
 * Check if products have sufficient stock for an order
 */
export async function checkStockAvailability(
  items: Array<{ product_id: string; quantity: number }>
): Promise<{
  available: boolean;
  insufficientItems?: Array<{ product_id: string; product_name: string; required: number; available: number }>;
}> {
  const insufficientItems = [];

  for (const item of items) {
    const products = await sql`
      SELECT id, name, stock_quantity
      FROM products
      WHERE id = ${item.product_id}
      LIMIT 1
    `;

    if (products.length === 0) {
      insufficientItems.push({
        product_id: item.product_id,
        product_name: 'Unknown Product',
        required: item.quantity,
        available: 0
      });
      continue;
    }

    const product = products[0];
    if (product.stock_quantity < item.quantity) {
      insufficientItems.push({
        product_id: product.id,
        product_name: product.name,
        required: item.quantity,
        available: product.stock_quantity
      });
    }
  }

  return {
    available: insufficientItems.length === 0,
    insufficientItems: insufficientItems.length > 0 ? insufficientItems : undefined
  };
}

/**
 * Get inventory movements for a product
 */
export async function getProductInventoryMovements(
  product_id: string,
  limit: number = 50
): Promise<InventoryMovementWithDetails[]> {
  const rows = await sql`
    SELECT
      im.*,
      p.name as product_name,
      u.name as staff_name,
      po.total_cents as order_total
    FROM inventory_movements im
    LEFT JOIN products p ON p.id = im.product_id
    LEFT JOIN users u ON u.id = im.staff_user_id
    LEFT JOIN pos_orders po ON po.id = im.related_order_id
    WHERE im.product_id = ${product_id}
    ORDER BY im.created_at DESC
    LIMIT ${limit}
  `;

  return rows as InventoryMovementWithDetails[];
}

/**
 * Get all recent inventory movements
 */
export async function getAllInventoryMovements(
  limit: number = 100,
  offset: number = 0
): Promise<InventoryMovementWithDetails[]> {
  const rows = await sql`
    SELECT
      im.*,
      p.name as product_name,
      u.name as staff_name
    FROM inventory_movements im
    LEFT JOIN products p ON p.id = im.product_id
    LEFT JOIN users u ON u.id = im.staff_user_id
    ORDER BY im.created_at DESC
    LIMIT ${limit}
    OFFSET ${offset}
  `;

  return rows as InventoryMovementWithDetails[];
}

/**
 * Get products with low stock
 */
export async function getLowStockProducts(): Promise<Product[]> {
  const rows = await sql`
    SELECT * FROM products
    WHERE is_active = true
    AND stock_quantity <= COALESCE(low_stock_threshold, 5)
    ORDER BY stock_quantity ASC
  `;

  return rows as Product[];
}

/**
 * Restore stock for a cancelled/refunded order
 */
export async function restoreStockForOrder(
  order_id: string,
  items: Array<{ product_id: string; quantity: number }>,
  staff_user_id?: string
): Promise<void> {
  for (const item of items) {
    await updateProductStock(
      item.product_id,
      item.quantity, // Positive for restoration
      'return',
      staff_user_id,
      order_id,
      `Stock restored - Order ${order_id.slice(0, 8)} cancelled/refunded`
    );
  }
}
