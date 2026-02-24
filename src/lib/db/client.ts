import { neon, neonConfig, Pool } from '@neondatabase/serverless';

// Configure Neon
neonConfig.fetchConnectionCache = true;

// Get database URL from environment
const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL && typeof window === 'undefined') {
  // Only throw during runtime server operations, not during build
  if (process.env.NODE_ENV === 'production' && !process.env.NEXT_PHASE) {
    console.warn('DATABASE_URL environment variable is not set - database operations will fail');
  }
}

// Create database client with proper error handling
export const sql = DATABASE_URL ? neon(DATABASE_URL) : (() => {
  throw new Error('DATABASE_URL not configured - database operations cannot proceed');
}) as any;

// Helper to ensure sql is available
export function ensureSql() {
  if (!sql || !DATABASE_URL) {
    throw new Error('DATABASE_URL not configured - please check environment variables');
  }
  return sql;
}

// Create Pool for parameterized queries
const pool = DATABASE_URL ? new Pool({ connectionString: DATABASE_URL }) : null;

// Export query function for parameterized queries
export async function query<T = any>(
  queryText: string,
  params?: any[]
): Promise<T[]> {
  if (!pool) {
    throw new Error('Database pool not initialized');
  }

  try {
    const client = await pool.connect();
    try {
      const result = await client.query(queryText, params);
      return result.rows as T[];
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  }
}

// Health check function
export async function checkDatabaseConnection(): Promise<boolean> {
  try {
    await sql`SELECT 1`;
    return true;
  } catch (error) {
    console.error('Database connection failed:', error);
    return false;
  }
}
