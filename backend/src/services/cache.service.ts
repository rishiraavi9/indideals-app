import Redis from 'ioredis';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const REDIS_PASSWORD = process.env.REDIS_PASSWORD;

// Create Redis client
export const redis = new Redis(REDIS_URL, {
  password: REDIS_PASSWORD,
  maxRetriesPerRequest: 3,
  retryStrategy(times) {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  // Gracefully handle connection errors
  lazyConnect: true,
});

// Check if Redis is available
let isRedisAvailable = false;

redis.on('connect', () => {
  console.log('✅ Redis connected');
  isRedisAvailable = true;
});

redis.on('error', (err) => {
  console.error('❌ Redis connection error:', err.message);
  isRedisAvailable = false;
});

// Try to connect
redis.connect().catch((err) => {
  console.warn('⚠️  Redis not available, caching disabled:', err.message);
});

/**
 * Cache TTL (Time To Live) in seconds
 */
export const CacheTTL = {
  SHORT: 60, // 1 minute - for frequently changing data
  MEDIUM: 300, // 5 minutes - for moderately changing data
  LONG: 1800, // 30 minutes - for rarely changing data
  VERY_LONG: 3600, // 1 hour - for static data
} as const;

/**
 * Cache key prefixes for different data types
 */
export const CachePrefix = {
  DEALS: 'deals',
  DEAL: 'deal',
  CATEGORIES: 'categories',
  SEARCH: 'search',
  AGGREGATIONS: 'agg',
  USER: 'user',
} as const;

/**
 * Get value from cache
 */
export async function getCache<T>(key: string): Promise<T | null> {
  if (!isRedisAvailable) return null;

  try {
    const value = await redis.get(key);
    if (!value) return null;

    return JSON.parse(value) as T;
  } catch (error) {
    console.error('Cache get error:', error);
    return null;
  }
}

/**
 * Set value in cache with TTL
 */
export async function setCache(
  key: string,
  value: any,
  ttl: number = CacheTTL.MEDIUM
): Promise<void> {
  if (!isRedisAvailable) return;

  try {
    await redis.setex(key, ttl, JSON.stringify(value));
  } catch (error) {
    console.error('Cache set error:', error);
  }
}

/**
 * Delete cache key(s)
 */
export async function deleteCache(pattern: string): Promise<void> {
  if (!isRedisAvailable) return;

  try {
    // If pattern contains wildcards, use SCAN to find keys
    if (pattern.includes('*')) {
      const keys: string[] = [];
      const stream = redis.scanStream({ match: pattern, count: 100 });

      stream.on('data', (resultKeys: string[]) => {
        keys.push(...resultKeys);
      });

      await new Promise<void>((resolve) => {
        stream.on('end', async () => {
          if (keys.length > 0) {
            await redis.del(...keys);
          }
          resolve();
        });
      });
    } else {
      // Single key deletion
      await redis.del(pattern);
    }
  } catch (error) {
    console.error('Cache delete error:', error);
  }
}

/**
 * Invalidate all deals-related caches
 */
export async function invalidateDealsCache(): Promise<void> {
  await Promise.all([
    deleteCache(`${CachePrefix.DEALS}:*`),
    deleteCache(`${CachePrefix.SEARCH}:*`),
    deleteCache(`${CachePrefix.AGGREGATIONS}:*`),
  ]);
}

/**
 * Invalidate specific deal cache
 */
export async function invalidateDealCache(dealId: string): Promise<void> {
  await Promise.all([
    deleteCache(`${CachePrefix.DEAL}:${dealId}`),
    invalidateDealsCache(), // Also invalidate list caches
  ]);
}

/**
 * Wrapper for cache-aside pattern
 */
export async function cacheAside<T>(
  key: string,
  ttl: number,
  fetchFn: () => Promise<T>
): Promise<T> {
  // Try to get from cache
  const cached = await getCache<T>(key);
  if (cached !== null) {
    return cached;
  }

  // Cache miss - fetch from source
  const data = await fetchFn();

  // Store in cache (don't await - fire and forget)
  setCache(key, data, ttl).catch(() => {});

  return data;
}

/**
 * Get Redis stats
 */
export async function getCacheStats() {
  if (!isRedisAvailable) {
    return { available: false };
  }

  try {
    const info = await redis.info('stats');
    const keyspace = await redis.info('keyspace');
    const dbSize = await redis.dbsize();

    return {
      available: true,
      dbSize,
      info: info.split('\r\n').filter(Boolean),
      keyspace: keyspace.split('\r\n').filter(Boolean),
    };
  } catch (error) {
    return { available: false, error: String(error) };
  }
}
