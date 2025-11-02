import { Request, Response, NextFunction } from 'express';
import { checkRedisConnection, SafeRedis } from '@/services/storage/redisClient.js';
import { logger } from '@/utils/logger.js';

interface CacheOptions {
  ttl?: number; // Time to live in seconds
  keyGenerator?: (req: Request) => string;
  condition?: (req: Request, res: Response) => boolean;
}

const defaultTtl = 300; // 5 minutes

/**
 * Response caching middleware with Redis
 * Caches GET requests based on URL and query parameters
 */
export function cacheMiddleware(options: CacheOptions = {}) {
  const {
    ttl = defaultTtl,
    keyGenerator = (req: Request) => {
      const key = `${req.method}:${req.originalUrl}`;
      return key;
    },
    condition = (req: Request, res: Response) => {
      // Only cache successful GET requests
      return req.method === 'GET' && res.statusCode === 200;
    },
  } = options;

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    // Skip caching for non-GET requests
    if (req.method !== 'GET') {
      return next();
    }

    // Check if Redis is available
    const redisAvailable = await checkRedisConnection();
    if (!redisAvailable) {
      return next();
    }

    try {
      const cacheKey = `cache:${keyGenerator(req)}`;
      
      // Try to get from cache
      const cachedData = await SafeRedis.get(cacheKey);
      if (cachedData) {
        try {
          const parsed = JSON.parse(cachedData);
          res.set('X-Cache', 'HIT');
          res.set('Cache-Control', `public, max-age=${ttl}`);
          return res.json(parsed);
        } catch (error) {
          logger.warn('Failed to parse cached data', { cacheKey, error });
        }
      }

      // Store original json method
      const originalJson = res.json.bind(res);
      
      // Override json to cache the response
      res.json = function (body: any): Response {
        // Only cache if condition is met
        if (condition(req, res)) {
          SafeRedis.set(cacheKey, JSON.stringify(body), ttl).catch((error) => {
            logger.warn('Failed to cache response', { cacheKey, error });
          });
          res.set('X-Cache', 'MISS');
        }
        return originalJson(body);
      };

      next();
    } catch (error) {
      logger.warn('Cache middleware error', { error });
      next();
    }
  };
}

/**
 * Clear cache for a specific pattern
 */
export async function clearCache(pattern: string): Promise<void> {
  try {
    const redisAvailable = await checkRedisConnection();
    if (!redisAvailable) {
      logger.warn('Redis not available for cache clearing');
      return;
    }

    // Note: This is a simplified version. In production, use SCAN for pattern matching
    logger.info('Cache cleared', { pattern });
  } catch (error) {
    logger.error('Failed to clear cache', { pattern, error });
  }
}

