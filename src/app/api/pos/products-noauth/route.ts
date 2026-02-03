import { NextRequest, NextResponse } from 'next/server';
import {
  getAllProducts,
  getProductCategories
} from '@/lib/db/repositories/products';

/**
 * TEMPORARY - Products endpoint without auth for debugging
 * DELETE THIS AFTER FIXING THE ISSUE
 */
export async function GET(request: NextRequest) {
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

    return NextResponse.json({
      success: true,
      count: products.length,
      products: products
    });
  } catch (error: any) {
    console.error('Error fetching products:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch products',
        details: error.message,
        stack: error.stack
      },
      { status: 500 }
    );
  }
}
