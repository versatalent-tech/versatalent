/**
 * Performance Optimization Utilities
 * Provides caching, lazy loading, and optimization helpers
 */

import { cache as memoryCache, CACHE_TTL, getCacheHeaders } from './cache';

// ============================================
// REQUEST DEDUPLICATION
// ============================================

interface PendingRequest<T> {
  promise: Promise<T>;
  timestamp: number;
}

const pendingRequests = new Map<string, PendingRequest<unknown>>();
const DEDUP_WINDOW_MS = 100; // Deduplicate requests within 100ms

/**
 * Deduplicate identical concurrent requests
 * Prevents multiple components from making the same API call simultaneously
 */
export async function deduplicatedFetch<T>(
  key: string,
  fetcher: () => Promise<T>
): Promise<T> {
  const now = Date.now();
  const existing = pendingRequests.get(key);

  if (existing && now - existing.timestamp < DEDUP_WINDOW_MS) {
    return existing.promise as Promise<T>;
  }

  const promise = fetcher().finally(() => {
    // Clean up after request completes
    setTimeout(() => {
      pendingRequests.delete(key);
    }, DEDUP_WINDOW_MS);
  });

  pendingRequests.set(key, { promise, timestamp: now });
  return promise;
}

// ============================================
// STALE-WHILE-REVALIDATE PATTERN
// ============================================

interface SWREntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

const swrCache = new Map<string, SWREntry<unknown>>();

/**
 * Stale-while-revalidate data fetching
 * Returns cached data immediately while revalidating in background
 */
export async function staleWhileRevalidate<T>(
  key: string,
  fetcher: () => Promise<T>,
  options: { ttl?: number; staleTime?: number } = {}
): Promise<T> {
  const { ttl = CACHE_TTL.MEDIUM, staleTime = ttl * 2 } = options;
  const now = Date.now();
  const cached = swrCache.get(key) as SWREntry<T> | undefined;

  // If we have cached data
  if (cached) {
    const age = now - cached.timestamp;

    // Fresh: return immediately
    if (age < cached.ttl) {
      return cached.data;
    }

    // Stale: return immediately but revalidate in background
    if (age < staleTime) {
      // Fire-and-forget revalidation
      fetcher().then((data) => {
        swrCache.set(key, { data, timestamp: Date.now(), ttl });
      }).catch(console.error);

      return cached.data;
    }
  }

  // No cache or too stale: fetch fresh
  const data = await fetcher();
  swrCache.set(key, { data, timestamp: now, ttl });
  return data;
}

// ============================================
// BATCH REQUEST AGGREGATION
// ============================================

interface BatchConfig<T, K> {
  maxBatchSize: number;
  delayMs: number;
  executor: (keys: K[]) => Promise<Map<K, T>>;
}

/**
 * Creates a batched loader that aggregates multiple requests
 * into a single batch operation
 */
export function createBatchLoader<T, K extends string | number>(
  config: BatchConfig<T, K>
) {
  let pendingKeys: K[] = [];
  let pendingResolvers: Map<K, { resolve: (value: T | undefined) => void; reject: (error: Error) => void }> = new Map();
  let batchTimeout: NodeJS.Timeout | null = null;

  const executeBatch = async () => {
    const keys = [...pendingKeys];
    const resolvers = new Map(pendingResolvers);
    pendingKeys = [];
    pendingResolvers = new Map();
    batchTimeout = null;

    try {
      const results = await config.executor(keys);
      for (const [key, resolver] of resolvers) {
        resolver.resolve(results.get(key));
      }
    } catch (error) {
      for (const resolver of resolvers.values()) {
        resolver.reject(error as Error);
      }
    }
  };

  return {
    load: (key: K): Promise<T | undefined> => {
      return new Promise((resolve, reject) => {
        pendingKeys.push(key);
        pendingResolvers.set(key, { resolve, reject });

        if (pendingKeys.length >= config.maxBatchSize) {
          if (batchTimeout) clearTimeout(batchTimeout);
          executeBatch();
        } else if (!batchTimeout) {
          batchTimeout = setTimeout(executeBatch, config.delayMs);
        }
      });
    },
    loadMany: async (keys: K[]): Promise<Map<K, T | undefined>> => {
      const results = new Map<K, T | undefined>();
      await Promise.all(
        keys.map(async (key) => {
          const value = await config.executor([key]);
          results.set(key, value.get(key));
        })
      );
      return results;
    },
  };
}

// ============================================
// LAZY INITIALIZATION
// ============================================

/**
 * Lazily initialize expensive resources on first use
 */
export function lazy<T>(initializer: () => T): () => T {
  let value: T | undefined;
  let initialized = false;

  return () => {
    if (!initialized) {
      value = initializer();
      initialized = true;
    }
    return value!;
  };
}

/**
 * Async lazy initialization
 */
export function lazyAsync<T>(initializer: () => Promise<T>): () => Promise<T> {
  let promise: Promise<T> | undefined;

  return () => {
    if (!promise) {
      promise = initializer();
    }
    return promise;
  };
}

// ============================================
// RESPONSE OPTIMIZATION
// ============================================

/**
 * Create an optimized JSON response with proper caching headers
 */
export function optimizedJsonResponse(
  data: unknown,
  options: {
    status?: number;
    maxAge?: number;
    staleWhileRevalidate?: number;
    isPrivate?: boolean;
  } = {}
): Response {
  const {
    status = 200,
    maxAge = 60,
    staleWhileRevalidate = 300,
    isPrivate = false,
  } = options;

  return new Response(JSON.stringify(data), {
    status,
    headers: getCacheHeaders({ maxAge, staleWhileRevalidate, isPrivate }),
  });
}

/**
 * Create a streaming JSON response for large datasets
 */
export function streamJsonResponse<T>(
  items: T[],
  transform?: (item: T) => unknown
): Response {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode('['));

      for (let i = 0; i < items.length; i++) {
        const item = transform ? transform(items[i]) : items[i];
        const json = JSON.stringify(item);
        const prefix = i > 0 ? ',' : '';
        controller.enqueue(encoder.encode(prefix + json));
      }

      controller.enqueue(encoder.encode(']'));
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'application/json',
      'Transfer-Encoding': 'chunked',
    },
  });
}

// ============================================
// PERFORMANCE MONITORING
// ============================================

interface PerformanceMetric {
  name: string;
  duration: number;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

const performanceMetrics: PerformanceMetric[] = [];
const MAX_METRICS = 1000;

/**
 * Measure execution time of an async function
 */
export async function measureAsync<T>(
  name: string,
  fn: () => Promise<T>,
  metadata?: Record<string, unknown>
): Promise<T> {
  const start = performance.now();
  try {
    return await fn();
  } finally {
    const duration = performance.now() - start;
    recordMetric(name, duration, metadata);
  }
}

/**
 * Measure execution time of a sync function
 */
export function measureSync<T>(
  name: string,
  fn: () => T,
  metadata?: Record<string, unknown>
): T {
  const start = performance.now();
  try {
    return fn();
  } finally {
    const duration = performance.now() - start;
    recordMetric(name, duration, metadata);
  }
}

function recordMetric(
  name: string,
  duration: number,
  metadata?: Record<string, unknown>
) {
  performanceMetrics.push({
    name,
    duration,
    timestamp: Date.now(),
    metadata,
  });

  // Keep only recent metrics
  if (performanceMetrics.length > MAX_METRICS) {
    performanceMetrics.shift();
  }

  // Log slow operations
  if (duration > 1000) {
    console.warn(`[SLOW] ${name} took ${duration.toFixed(2)}ms`, metadata);
  }
}

/**
 * Get performance metrics for analysis
 */
export function getPerformanceMetrics(filter?: {
  name?: string;
  minDuration?: number;
  since?: number;
}): PerformanceMetric[] {
  let metrics = [...performanceMetrics];

  if (filter?.name) {
    metrics = metrics.filter((m) => m.name.includes(filter.name!));
  }
  if (filter?.minDuration) {
    metrics = metrics.filter((m) => m.duration >= filter.minDuration!);
  }
  if (filter?.since) {
    metrics = metrics.filter((m) => m.timestamp >= filter.since!);
  }

  return metrics;
}

/**
 * Get performance statistics
 */
export function getPerformanceStats(name?: string): {
  count: number;
  avgDuration: number;
  minDuration: number;
  maxDuration: number;
  p50: number;
  p95: number;
  p99: number;
} | null {
  const metrics = name
    ? performanceMetrics.filter((m) => m.name === name)
    : performanceMetrics;

  if (metrics.length === 0) return null;

  const durations = metrics.map((m) => m.duration).sort((a, b) => a - b);
  const sum = durations.reduce((a, b) => a + b, 0);

  return {
    count: durations.length,
    avgDuration: sum / durations.length,
    minDuration: durations[0],
    maxDuration: durations[durations.length - 1],
    p50: durations[Math.floor(durations.length * 0.5)],
    p95: durations[Math.floor(durations.length * 0.95)],
    p99: durations[Math.floor(durations.length * 0.99)],
  };
}

// ============================================
// DEBOUNCE & THROTTLE
// ============================================

/**
 * Debounce function execution
 */
export function debounce<T extends (...args: Parameters<T>) => ReturnType<T>>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout | null = null;

  return (...args: Parameters<T>) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}

/**
 * Throttle function execution
 */
export function throttle<T extends (...args: Parameters<T>) => ReturnType<T>>(
  fn: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle = false;

  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      fn(...args);
      inThrottle = true;
      setTimeout(() => {
        inThrottle = false;
      }, limit);
    }
  };
}

// ============================================
// PRELOADING UTILITIES
// ============================================

/**
 * Preload an image
 */
export function preloadImage(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      resolve();
      return;
    }

    const img = new Image();
    img.onload = () => resolve();
    img.onerror = () => reject(new Error(`Failed to preload: ${src}`));
    img.src = src;
  });
}

/**
 * Preload multiple images with concurrency control
 */
export async function preloadImages(
  urls: string[],
  concurrency: number = 3
): Promise<void> {
  const queue = [...urls];
  const active: Promise<void>[] = [];

  while (queue.length > 0 || active.length > 0) {
    while (active.length < concurrency && queue.length > 0) {
      const url = queue.shift()!;
      const promise = preloadImage(url)
        .catch(() => {}) // Ignore individual failures
        .finally(() => {
          const index = active.indexOf(promise);
          if (index > -1) active.splice(index, 1);
        });
      active.push(promise);
    }

    if (active.length > 0) {
      await Promise.race(active);
    }
  }
}

/**
 * Prefetch a URL for navigation
 */
export function prefetchUrl(url: string): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  const link = document.createElement('link');
  link.rel = 'prefetch';
  link.href = url;
  document.head.appendChild(link);
}

// ============================================
// EXPORTS
// ============================================

export {
  memoryCache,
  CACHE_TTL,
  getCacheHeaders,
};
