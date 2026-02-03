import { NextRequest, NextResponse } from 'next/server';
import {
  getProductById,
  updateProduct,
  deleteProduct
} from '@/lib/db/repositories/products';
import type { UpdateProductRequest } from '@/lib/db/types';
import { withPOSAuth } from '@/lib/auth/pos-auth';

// GET single product (requires staff/admin auth)
export const GET = withPOSAuth(async (
  request: NextRequest,
  auth,
  context: { params: { id: string } }
) => {
  try {
    const { id } = context.params;
    const product = await getProductById(id);

    if (!product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(product);
  } catch (error) {
    console.error('Error fetching product:', error);
    return NextResponse.json(
      { error: 'Failed to fetch product' },
      { status: 500 }
    );
  }
});

// PUT - Update product (requires staff/admin auth)
export const PUT = withPOSAuth(async (
  request: NextRequest,
  auth,
  context: { params: { id: string } }
) => {
  try {
    const { id } = context.params;
    const data: UpdateProductRequest = await request.json();

    if (data.price_cents !== undefined && data.price_cents < 0) {
      return NextResponse.json(
        { error: 'Price must be non-negative' },
        { status: 400 }
      );
    }

    const product = await updateProduct(id, data);

    if (!product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(product);
  } catch (error: any) {
    console.error('Error updating product:', error);
    return NextResponse.json(
      { error: 'Failed to update product', details: error.message },
      { status: 500 }
    );
  }
});

// DELETE - Delete product (requires admin auth)
export const DELETE = withPOSAuth(async (
  request: NextRequest,
  auth,
  context: { params: { id: string } }
) => {
  try {
    const { id } = context.params;
    const success = await deleteProduct(id);

    if (!success) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting product:', error);
    return NextResponse.json(
      { error: 'Failed to delete product', details: error.message },
      { status: 500 }
    );
  }
});
