/**
 * Simple in-memory cache for frequently accessed data
 * For production, replace with Redis/Vercel KV
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

class MemoryCache {
  private cache: Map<string, CacheEntry<unknown>> = new Map();
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Clean up expired entries every minute
    if (typeof setInterval !== 'undefined') {
      this.cleanupInterval = setInterval(() => this.cleanup(), 60000);
    }
  }

  /**
   * Get a cached value
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key) as CacheEntry<T> | undefined;

    if (!entry) {
      return null;
    }

    // Check if expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  /**
   * Set a cached value with TTL (in milliseconds)
   */
  set<T>(key: string, data: T, ttlMs: number = 60000): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttlMs,
    });
  }

  /**
   * Delete a cached value
   */
  delete(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Delete all cached values matching a prefix
   */
  invalidatePrefix(prefix: string): void {
    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Clear all cached values
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Clean up expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Get cache stats
   */
  stats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }
}

// Singleton instance
export const cache = new MemoryCache();

// Cache TTL constants (in milliseconds)
export const CACHE_TTL = {
  SHORT: 30 * 1000,       // 30 seconds
  MEDIUM: 60 * 1000,      // 1 minute
  LONG: 5 * 60 * 1000,    // 5 minutes
  VERY_LONG: 15 * 60 * 1000, // 15 minutes
} as const;

/**
 * Higher-order function to wrap async functions with caching
 */
export function withCache<T, Args extends unknown[]>(
  fn: (...args: Args) => Promise<T>,
  keyGenerator: (...args: Args) => string,
  ttlMs: number = CACHE_TTL.MEDIUM
): (...args: Args) => Promise<T> {
  return async (...args: Args): Promise<T> => {
    const key = keyGenerator(...args);

    // Check cache first
    const cached = cache.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    // Execute function and cache result
    const result = await fn(...args);
    cache.set(key, result, ttlMs);

    return result;
  };
}

/**
 * Helper to create cache-control headers for API responses
 */
export function getCacheHeaders(options: {
  maxAge?: number;
  staleWhileRevalidate?: number;
  isPrivate?: boolean;
}): HeadersInit {
  const {
    maxAge = 60,
    staleWhileRevalidate = 300,
    isPrivate = false
  } = options;

  const directive = isPrivate ? 'private' : 'public';

  return {
    'Cache-Control': `${directive}, s-maxage=${maxAge}, stale-while-revalidate=${staleWhileRevalidate}`,
    'Content-Type': 'application/json',
  };
}

/**
 * No-cache headers for sensitive endpoints
 */
export const NO_CACHE_HEADERS: HeadersInit = {
  'Cache-Control': 'no-store, no-cache, must-revalidate',
  'Content-Type': 'application/json',
};
