import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db/client';

/**
 * Test endpoint to check database connection and products table
 * No auth required - for debugging only
 */
export async function GET(request: NextRequest) {
  const results: any = {
    timestamp: new Date().toISOString(),
    checks: {}
  };

  try {
    // Check 1: Database connection
    try {
      const testQuery = await sql`SELECT NOW() as current_time`;
      results.checks.database_connection = {
        status: 'success',
        current_time: testQuery[0].current_time
      };
    } catch (error: any) {
      results.checks.database_connection = {
        status: 'failed',
        error: error.message
      };
    }

    // Check 2: Products table exists
    try {
      const tableCheck = await sql`
        SELECT EXISTS (
          SELECT FROM information_schema.tables
          WHERE table_name = 'products'
        ) as exists
      `;
      results.checks.products_table = {
        status: tableCheck[0].exists ? 'exists' : 'missing',
        exists: tableCheck[0].exists
      };
    } catch (error: any) {
      results.checks.products_table = {
        status: 'failed',
        error: error.message
      };
    }

    // Check 3: Count products
    try {
      const countQuery = await sql`SELECT COUNT(*)::int as count FROM products`;
      results.checks.products_count = {
        status: 'success',
        count: countQuery[0].count
      };
    } catch (error: any) {
      results.checks.products_count = {
        status: 'failed',
        error: error.message
      };
    }

    // Check 4: Environment variables
    results.checks.environment = {
      DATABASE_URL: process.env.DATABASE_URL ? 'configured' : 'missing',
      NODE_ENV: process.env.NODE_ENV || 'development'
    };

    return NextResponse.json(results, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({
      ...results,
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
}
