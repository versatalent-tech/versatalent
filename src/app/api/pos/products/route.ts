import { NextRequest, NextResponse } from 'next/server';
import {
  getAllProducts,
  createProduct,
  getProductCategories
} from '@/lib/db/repositories/products';
import type { CreateProductRequest } from '@/lib/db/types';
import { withPOSAuth } from '@/lib/auth/pos-auth';

// GET all products or categories (requires staff/admin auth)
export const GET = withPOSAuth(async (request: NextRequest) => {
  try {
    const searchParams = request.nextUrl.searchParams;
    const activeOnly = searchParams.get('activeOnly') !== 'false';
    const category = searchParams.get('category');
    const categoriesOnly = searchParams.get('categoriesOnly') === 'true';

    // Return categories list
    if (categoriesOnly) {
      const categories = await getProductCategories();
      return NextResponse.json(categories);
    }

    // Return products
    const products = await getAllProducts({
      activeOnly,
      category: category || undefined
    });

    return NextResponse.json(products);
  } catch (error: any) {
    console.error('Error fetching products:', error);

    // Return detailed error for debugging
    return NextResponse.json(
      {
        error: 'Failed to fetch products',
        details: error.message,
        hint: error.message.includes('relation "products" does not exist')
          ? 'Run migration 008_pos_system.sql in your database'
          : 'Check database connection and configuration'
      },
      { status: 500 }
    );
  }
});

// POST - Create new product (requires staff/admin auth)
export const POST = withPOSAuth(async (request: NextRequest) => {
  try {
    const data: CreateProductRequest = await request.json();

    // Validate required fields
    if (!data.name || data.price_cents === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: name, price_cents' },
        { status: 400 }
      );
    }

    if (data.price_cents < 0) {
      return NextResponse.json(
        { error: 'Price must be non-negative' },
        { status: 400 }
      );
    }

    const product = await createProduct(data);

    return NextResponse.json(product, { status: 201 });
  } catch (error: any) {
    console.error('Error creating product:', error);
    return NextResponse.json(
      { error: 'Failed to create product', details: error.message },
      { status: 500 }
    );
  }
});
