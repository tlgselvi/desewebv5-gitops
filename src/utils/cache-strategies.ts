/**
 * Advanced Caching Strategies
 * 
 * Implements multiple caching patterns:
 * - Cache-Aside (Lazy Loading)
 * - Write-Through
 * - Write-Behind (Write-Back)
 * - Refresh-Ahead
 * 
 * Based on proven patterns from:
 * - Redis best practices
 * - AWS ElastiCache patterns
 * - Spring Cache abstraction
 */

import { redis } from '@/services/storage/redisClient.js';
import { logger } from './logger.js';

export interface CacheOptions {
  /** TTL in seconds */
  ttl?: number;
  /** Key prefix */
  keyPrefix?: string;
  /** Whether to serialize/deserialize JSON */
  serialize?: boolean;
}

/**
 * Cache-Aside (Lazy Loading) Pattern
 * 
 * Application is responsible for loading data into cache.
 * Cache doesn't interact with data source directly.
 */
export class CacheAsideStrategy {
  constructor(private options: CacheOptions = {}) {}

  /**
   * Get value from cache, or load from data source if not found
   */
  async getOrLoad<T>(
    key: string,
    loader: () => Promise<T>,
    options: CacheOptions = {}
  ): Promise<T> {
    const { ttl = 3600, keyPrefix = 'cache', serialize = true } = {
      ...this.options,
      ...options,
    };

    const cacheKey = `${keyPrefix}:${key}`;

    try {
      // Try to get from cache
      const cached = await redis.get(cacheKey);
      
      if (cached) {
        logger.debug('[Cache-Aside] Cache hit', { key: cacheKey });
        return serialize ? JSON.parse(cached) : (cached as T);
      }

      // Cache miss - load from data source
      logger.debug('[Cache-Aside] Cache miss, loading from source', { key: cacheKey });
      const value = await loader();

      // Store in cache
      const serialized = serialize ? JSON.stringify(value) : String(value);
      await redis.setex(cacheKey, ttl, serialized);

      return value;
    } catch (error) {
      logger.error('[Cache-Aside] Error in getOrLoad', {
        key: cacheKey,
        error: error instanceof Error ? error.message : String(error),
      });
      // On error, try to load from source
      return loader();
    }
  }

  /**
   * Invalidate cache entry
   */
  async invalidate(key: string, options: CacheOptions = {}): Promise<void> {
    const { keyPrefix = 'cache' } = { ...this.options, ...options };
    const cacheKey = `${keyPrefix}:${key}`;
    await redis.del(cacheKey);
    logger.debug('[Cache-Aside] Cache invalidated', { key: cacheKey });
  }
}

/**
 * Write-Through Pattern
 * 
 * Data is written to cache and data source simultaneously.
 * Ensures consistency but may be slower.
 */
export class WriteThroughStrategy {
  constructor(
    private options: CacheOptions = {},
    private writer: (key: string, value: unknown) => Promise<void>
  ) {}

  /**
   * Write value to both cache and data source
   */
  async write<T>(
    key: string,
    value: T,
    options: CacheOptions = {}
  ): Promise<void> {
    const { ttl = 3600, keyPrefix = 'cache', serialize = true } = {
      ...this.options,
      ...options,
    };

    const cacheKey = `${keyPrefix}:${key}`;

    try {
      // Write to data source first
      await this.writer(key, value);

      // Then write to cache
      const serialized = serialize ? JSON.stringify(value) : String(value);
      await redis.setex(cacheKey, ttl, serialized);

      logger.debug('[Write-Through] Written to cache and source', { key: cacheKey });
    } catch (error) {
      logger.error('[Write-Through] Error writing', {
        key: cacheKey,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Read from cache (write-through doesn't change read behavior)
   */
  async read<T>(key: string, options: CacheOptions = {}): Promise<T | null> {
    const { keyPrefix = 'cache', serialize = true } = {
      ...this.options,
      ...options,
    };

    const cacheKey = `${keyPrefix}:${key}`;

    try {
      const cached = await redis.get(cacheKey);
      if (cached) {
        return serialize ? JSON.parse(cached) : (cached as T);
      }
      return null;
    } catch (error) {
      logger.error('[Write-Through] Error reading', {
        key: cacheKey,
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }
}

/**
 * Write-Behind (Write-Back) Pattern
 * 
 * Data is written to cache immediately, and written to data source asynchronously.
 * Faster writes but risk of data loss if cache fails before write-back.
 */
export class WriteBehindStrategy {
  private writeQueue: Map<string, { value: unknown; timestamp: number }> = new Map();
  private flushInterval: NodeJS.Timeout | null = null;

  constructor(
    private options: CacheOptions = {},
    private writer: (key: string, value: unknown) => Promise<void>,
    private flushIntervalMs: number = 5000
  ) {
    this.startFlushInterval();
  }

  /**
   * Write value to cache immediately, queue for async write to data source
   */
  async write<T>(
    key: string,
    value: T,
    options: CacheOptions = {}
  ): Promise<void> {
    const { ttl = 3600, keyPrefix = 'cache', serialize = true } = {
      ...this.options,
      ...options,
    };

    const cacheKey = `${keyPrefix}:${key}`;

    try {
      // Write to cache immediately
      const serialized = serialize ? JSON.stringify(value) : String(value);
      await redis.setex(cacheKey, ttl, serialized);

      // Queue for async write to data source
      this.writeQueue.set(key, { value, timestamp: Date.now() });

      logger.debug('[Write-Behind] Written to cache, queued for source', { key: cacheKey });
    } catch (error) {
      logger.error('[Write-Behind] Error writing to cache', {
        key: cacheKey,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Flush queued writes to data source
   */
  async flush(): Promise<void> {
    if (this.writeQueue.size === 0) {
      return;
    }

    const entries = Array.from(this.writeQueue.entries());
    this.writeQueue.clear();

    logger.debug('[Write-Behind] Flushing queued writes', { count: entries.length });

    // Write all queued entries
    const promises = entries.map(async ([key, { value }]) => {
      try {
        await this.writer(key, value);
        logger.debug('[Write-Behind] Flushed to source', { key });
      } catch (error) {
        logger.error('[Write-Behind] Error flushing to source', {
          key,
          error: error instanceof Error ? error.message : String(error),
        });
        // Re-queue on error
        this.writeQueue.set(key, { value, timestamp: Date.now() });
      }
    });

    await Promise.allSettled(promises);
  }

  /**
   * Start periodic flush interval
   */
  private startFlushInterval(): void {
    this.flushInterval = setInterval(() => {
      this.flush().catch((error) => {
        logger.error('[Write-Behind] Error in flush interval', {
          error: error instanceof Error ? error.message : String(error),
        });
      });
    }, this.flushIntervalMs);
  }

  /**
   * Stop flush interval (call on shutdown)
   */
  stop(): void {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
      this.flushInterval = null;
    }
    // Flush remaining writes
    this.flush().catch((error) => {
      logger.error('[Write-Behind] Error in final flush', {
        error: error instanceof Error ? error.message : String(error),
      });
    });
  }
}

/**
 * Refresh-Ahead Pattern
 * 
 * Proactively refresh cache entries before they expire.
 * Reduces cache misses but uses more resources.
 */
export class RefreshAheadStrategy {
  private refreshTimers: Map<string, NodeJS.Timeout> = new Map();

  constructor(
    private options: CacheOptions = {},
    private loader: (key: string) => Promise<unknown>
  ) {}

  /**
   * Get value from cache, schedule refresh if near expiration
   */
  async getOrLoad<T>(
    key: string,
    loader: () => Promise<T>,
    options: CacheOptions = {}
  ): Promise<T> {
    const { ttl = 3600, keyPrefix = 'cache', serialize = true } = {
      ...this.options,
      ...options,
    };

    const cacheKey = `${keyPrefix}:${key}`;

    try {
      const cached = await redis.get(cacheKey);
      
      if (cached) {
        // Check TTL and schedule refresh if needed
        const ttlRemaining = await redis.ttl(cacheKey);
        const refreshThreshold = ttl * 0.2; // Refresh when 20% TTL remains

        if (ttlRemaining > 0 && ttlRemaining < refreshThreshold) {
          this.scheduleRefresh(key, loader, options);
        }

        return serialize ? JSON.parse(cached) : (cached as T);
      }

      // Cache miss - load and cache
      const value = await loader();
      const serialized = serialize ? JSON.stringify(value) : String(value);
      await redis.setex(cacheKey, ttl, serialized);

      // Schedule refresh
      this.scheduleRefresh(key, loader, options);

      return value;
    } catch (error) {
      logger.error('[Refresh-Ahead] Error in getOrLoad', {
        key: cacheKey,
        error: error instanceof Error ? error.message : String(error),
      });
      return loader();
    }
  }

  /**
   * Schedule background refresh
   */
  private scheduleRefresh<T>(
    key: string,
    loader: () => Promise<T>,
    options: CacheOptions
  ): void {
    // Clear existing timer
    const existing = this.refreshTimers.get(key);
    if (existing) {
      clearTimeout(existing);
    }

    const { ttl = 3600, keyPrefix = 'cache', serialize = true } = {
      ...this.options,
      ...options,
    };

    const cacheKey = `${keyPrefix}:${key}`;
    const refreshTime = ttl * 0.8 * 1000; // Refresh at 80% of TTL

    const timer = setTimeout(async () => {
      try {
        logger.debug('[Refresh-Ahead] Refreshing cache', { key: cacheKey });
        const value = await loader();
        const serialized = serialize ? JSON.stringify(value) : String(value);
        await redis.setex(cacheKey, ttl, serialized);
        this.refreshTimers.delete(key);
      } catch (error) {
        logger.error('[Refresh-Ahead] Error refreshing', {
          key: cacheKey,
          error: error instanceof Error ? error.message : String(error),
        });
        this.refreshTimers.delete(key);
      }
    }, refreshTime);

    this.refreshTimers.set(key, timer);
  }

  /**
   * Cleanup all refresh timers
   */
  cleanup(): void {
    this.refreshTimers.forEach((timer) => clearTimeout(timer));
    this.refreshTimers.clear();
  }
}

// Export singleton instances
export const cacheAside = new CacheAsideStrategy();
export const refreshAhead = new RefreshAheadStrategy(
  {},
  async (key: string) => {
    throw new Error('Loader not configured for refresh-ahead strategy');
  }
);

