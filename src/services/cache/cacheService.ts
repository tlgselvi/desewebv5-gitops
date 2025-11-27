/**
 * Cache Service - Centralized caching with Redis
 * Provides consistent caching patterns across the application
 */

import { redis } from '@/services/storage/redisClient.js';
import { logger } from '@/utils/logger.js';
import { recordCacheHit, recordCacheMiss } from '@/middleware/prometheus.js';

export interface CacheOptions {
  ttl?: number; // Time to live in seconds
  prefix?: string; // Cache key prefix
}

export class CacheService {
  private defaultTTL = 300; // 5 minutes default

  /**
   * Get value from cache
   */
  async get<T>(key: string, options?: CacheOptions): Promise<T | null> {
    try {
      const fullKey = this.buildKey(key, options?.prefix);
      const cached = await redis.get(fullKey);
      
      if (!cached) {
        // Record cache miss
        if (options?.prefix) {
          recordCacheMiss(options.prefix);
        }
        return null;
      }

      // Record cache hit
      if (options?.prefix) {
        recordCacheHit(options.prefix);
      }

      return JSON.parse(cached) as T;
    } catch (error) {
      logger.error('Cache get error', { key, error });
      return null;
    }
  }

  /**
   * Set value in cache
   */
  async set<T>(key: string, value: T, options?: CacheOptions): Promise<void> {
    try {
      const fullKey = this.buildKey(key, options?.prefix);
      const ttl = options?.ttl ?? this.defaultTTL;
      const serialized = JSON.stringify(value);

      await redis.setex(fullKey, ttl, serialized);
    } catch (error) {
      logger.error('Cache set error', { key, error });
      // Don't throw - cache failures shouldn't break the app
    }
  }

  /**
   * Delete value from cache
   */
  async delete(key: string, options?: CacheOptions): Promise<void> {
    try {
      const fullKey = this.buildKey(key, options?.prefix);
      await redis.del(fullKey);
    } catch (error) {
      logger.error('Cache delete error', { key, error });
    }
  }

  /**
   * Delete multiple keys matching pattern
   */
  async deletePattern(pattern: string, options?: CacheOptions): Promise<number> {
    try {
      const fullPattern = this.buildKey(pattern, options?.prefix);
      const keys = await redis.keys(fullPattern);
      
      if (keys.length === 0) {
        return 0;
      }

      return await redis.del(...keys);
    } catch (error) {
      logger.error('Cache delete pattern error', { pattern, error });
      return 0;
    }
  }

  /**
   * Invalidate cache by pattern (e.g., "finance:*" to invalidate all finance caches)
   */
  async invalidate(pattern: string, options?: CacheOptions): Promise<number> {
    return this.deletePattern(pattern, options);
  }

  /**
   * Get or set pattern - get from cache, or compute and cache if missing
   */
  async getOrSet<T>(
    key: string,
    computeFn: () => Promise<T>,
    options?: CacheOptions
  ): Promise<T> {
    const cached = await this.get<T>(key, options);
    
    if (cached !== null) {
      return cached;
    }

    const value = await computeFn();
    await this.set(key, value, options);
    
    return value;
  }

  /**
   * Build cache key with prefix
   */
  private buildKey(key: string, prefix?: string): string {
    if (prefix) {
      return `${prefix}:${key}`;
    }
    return key;
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<{
    hitRate: number;
    missRate: number;
    totalKeys: number;
  }> {
    try {
      const info = await redis.info('stats');
      const keyspace = await redis.info('keyspace');
      
      // Parse Redis info output (simplified)
      const keys = await redis.dbsize();
      
      return {
        hitRate: 0, // Would need to track hits/misses separately
        missRate: 0,
        totalKeys: keys,
      };
    } catch (error) {
      logger.error('Cache stats error', { error });
      return {
        hitRate: 0,
        missRate: 0,
        totalKeys: 0,
      };
    }
  }
}

// Export singleton instance
export const cacheService = new CacheService();

// Cache key prefixes
export const CACHE_PREFIXES = {
  FINANCE: 'finance',
  CRM: 'crm',
  INVENTORY: 'inventory',
  IOT: 'iot',
  HR: 'hr',
  SERVICE: 'service',
  SEO: 'seo',
  MCP: 'mcp',
  USER: 'user',
} as const;

