import { neon, neonConfig } from '@neondatabase/serverless';

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

// Create database client (will be null if no DATABASE_URL during build)
export const sql = DATABASE_URL ? neon(DATABASE_URL) : null as any;

// Export query function for convenience
export async function query<T = any>(
  queryText: string,
  params?: any[]
): Promise<T[]> {
  try {
    const result = await sql(queryText, params);
    return result as T[];
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
