import { sql, query } from '../client';
import type { Product, CreateProductRequest, UpdateProductRequest } from '../types';

/**
 * Get all active products
 */
export async function getAllProducts(options: {
  activeOnly?: boolean;
  category?: string;
} = {}): Promise<Product[]> {
  const { activeOnly = true, category } = options;

  // Use tagged template syntax - Neon requires this
  if (category) {
    if (activeOnly) {
      return await sql`
        SELECT * FROM products
        WHERE is_active = true AND category = ${category}
        ORDER BY category, name
      ` as Product[];
    } else {
      return await sql`
        SELECT * FROM products
        WHERE category = ${category}
        ORDER BY category, name
      ` as Product[];
    }
  } else {
    if (activeOnly) {
      return await sql`
        SELECT * FROM products
        WHERE is_active = true
        ORDER BY category, name
      ` as Product[];
    } else {
      return await sql`
        SELECT * FROM products
        ORDER BY category, name
      ` as Product[];
    }
  }
}

/**
 * Get product by ID
 */
export async function getProductById(id: string): Promise<Product | null> {
  const rows = await sql`
    SELECT * FROM products WHERE id = ${id} LIMIT 1
  `;
  return rows[0] as Product || null;
}

/**
 * Get products by IDs
 */
export async function getProductsByIds(ids: string[]): Promise<Product[]> {
  if (ids.length === 0) return [];

  const rows = await sql`
    SELECT * FROM products WHERE id = ANY(${ids})
  `;
  return rows as Product[];
}

/**
 * Create a new product
 */
export async function createProduct(data: CreateProductRequest): Promise<Product> {
  const {
    name,
    description,
    price_cents,
    currency = 'EUR',
    category,
    image_url,
    is_active = true,
    stock_quantity = 0
  } = data;

  const rows = await sql`
    INSERT INTO products (
      name, description, price_cents, currency, category,
      image_url, is_active, stock_quantity
    ) VALUES (
      ${name}, ${description || null}, ${price_cents}, ${currency}, ${category || null},
      ${image_url || null}, ${is_active}, ${stock_quantity}
    )
    RETURNING *
  `;

  return rows[0] as Product;
}

/**
 * Update a product
 */
export async function updateProduct(id: string, data: UpdateProductRequest): Promise<Product | null> {
  // Define allowed fields (database columns only)
  const allowedFields = [
    'name', 'description', 'price_cents', 'currency', 'category',
    'image_url', 'is_active', 'stock_quantity'
  ];

  const updates: string[] = [];
  const params: any[] = [];
  let paramIndex = 1;

  Object.entries(data).forEach(([key, value]) => {
    // Skip fields that aren't in the allowed list
    if (!allowedFields.includes(key)) {
      return;
    }

    if (value !== undefined) {
      updates.push(`${key} = $${paramIndex}`);
      params.push(value);
      paramIndex++;
    }
  });

  if (updates.length === 0) {
    return getProductById(id);
  }

  params.push(id);
  const queryText = `
    UPDATE products
    SET ${updates.join(', ')}, updated_at = NOW()
    WHERE id = $${paramIndex}
    RETURNING *
  `;

  const result = await query(queryText, params);
  return result[0] as Product || null;
}

/**
 * Delete a product (soft delete by setting is_active to false)
 */
export async function deactivateProduct(id: string): Promise<boolean> {
  const rows = await sql`
    UPDATE products
    SET is_active = false, updated_at = NOW()
    WHERE id = ${id}
    RETURNING id
  `;

  return rows.length > 0;
}

/**
 * Hard delete a product
 */
export async function deleteProduct(id: string): Promise<boolean> {
  const rows = await sql`
    DELETE FROM products WHERE id = ${id} RETURNING id
  `;

  return rows.length > 0;
}

/**
 * Get product categories
 */
export async function getProductCategories(): Promise<string[]> {
  const rows = await sql`
    SELECT DISTINCT category
    FROM products
    WHERE category IS NOT NULL AND is_active = true
    ORDER BY category
  `;

  return rows.map(row => row.category).filter(Boolean);
}

/**
 * Update product stock quantity
 */
export async function updateProductStock(id: string, quantity: number): Promise<Product | null> {
  const rows = await sql`
    UPDATE products
    SET stock_quantity = stock_quantity + ${quantity}, updated_at = NOW()
    WHERE id = ${id}
    RETURNING *
  `;

  return rows[0] as Product || null;
}
