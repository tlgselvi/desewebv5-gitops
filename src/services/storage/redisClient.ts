import Redis from 'ioredis';
import { config } from '@/config/index.js';
import { logger } from '@/utils/logger.js';
import { CircuitBreaker } from '@/utils/retry.js';

// Circuit breaker for Redis operations
const redisCircuitBreaker = new CircuitBreaker({
  failureThreshold: 5,
  resetTimeout: 30000, // 30 seconds
  halfOpenMaxAttempts: 3,
});

// Redis connection with enhanced configuration
const redis = new Redis(config.redis.url, {
  retryStrategy: (times: number) => {
    const delay = Math.min(times * 50, 2000);
    logger.warn(`Redis retry attempt ${times}`, { delay });
    return delay;
  },
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
  enableOfflineQueue: true,
  lazyConnect: false,
  reconnectOnError: (err: Error) => {
    const targetErrors = ['READONLY', 'ECONNREFUSED', 'ETIMEDOUT'];
    return targetErrors.some((target) => err.message.includes(target));
  },
  connectTimeout: 10000, // 10 seconds
  commandTimeout: 5000, // 5 seconds
  keepAlive: 30000, // 30 seconds
});

// Enhanced error handling
redis.on('error', (err) => {
  logger.error('Redis connection error', { 
    error: err.message,
    code: (err as any).code,
  });
});

redis.on('connect', () => {
  logger.info('Redis connecting...');
});

redis.on('ready', () => {
  logger.info('Redis connected successfully and ready');
});

redis.on('close', () => {
  logger.warn('Redis connection closed');
});

redis.on('reconnecting', (delay: number) => {
  logger.info(`Redis reconnecting in ${delay}ms`);
});

// Health check with circuit breaker
export async function checkRedisConnection(): Promise<boolean> {
  try {
    return await redisCircuitBreaker.execute(async () => {
      const result = await redis.ping();
      return result === 'PONG';
    });
  } catch (error) {
    logger.error('Redis health check failed', { error });
    return false;
  }
}

// Enhanced Redis operations with circuit breaker
export const SafeRedis = {
  async get<T = string>(key: string): Promise<T | null> {
    try {
      return await redisCircuitBreaker.execute(async () => {
        const value = await redis.get(key);
        return value ? (JSON.parse(value) as T) : null;
      });
    } catch (error) {
      logger.error('Redis GET error', { error, key });
      return null;
    }
  },

  async set(key: string, value: any, ttlSeconds?: number): Promise<boolean> {
    try {
      await redisCircuitBreaker.execute(async () => {
        const serialized = JSON.stringify(value);
        if (ttlSeconds) {
          await redis.setex(key, ttlSeconds, serialized);
        } else {
          await redis.set(key, serialized);
        }
      });
      return true;
    } catch (error) {
      logger.error('Redis SET error', { error, key });
      return false;
    }
  },

  async del(key: string): Promise<boolean> {
    try {
      await redisCircuitBreaker.execute(async () => {
        await redis.del(key);
      });
      return true;
    } catch (error) {
      logger.error('Redis DEL error', { error, key });
      return false;
    }
  },

  async keys(pattern: string): Promise<string[]> {
    try {
      return await redisCircuitBreaker.execute(async () => {
        return await redis.keys(pattern);
      });
    } catch (error) {
      logger.error('Redis KEYS error', { error, pattern });
      return [];
    }
  },
};

export interface FeedbackEntry {
  timestamp: number;
  metric: string;
  anomaly: boolean;
  verdict: boolean;
  comment: string;
}

export const FeedbackStore = {
  /**
   * Save feedback entry to Redis
   */
  async save(entry: FeedbackEntry): Promise<void> {
    try {
      const key = `feedback:${Date.now()}`;
      const success = await SafeRedis.set(key, entry, 60 * 60 * 24 * 7); // 7 days TTL
      
      if (!success) {
        throw new Error('Failed to save feedback entry');
      }
      
      logger.info('Feedback entry saved to Redis', {
        key,
        metric: entry.metric,
      });
    } catch (error) {
      logger.error('Error saving feedback to Redis', { error, entry });
      throw error;
    }
  },

  /**
   * Get all feedback entries from Redis
   */
  async getAll(): Promise<FeedbackEntry[]> {
    try {
      const keys = await SafeRedis.keys('feedback:*');
      
      if (keys.length === 0) {
        return [];
      }

      const entries: FeedbackEntry[] = [];
      for (const key of keys) {
        const entry = await SafeRedis.get<FeedbackEntry>(key);
        if (entry) {
          entries.push(entry);
        }
      }

      return entries.sort((a, b) => b.timestamp - a.timestamp);
    } catch (error) {
      logger.error('Error retrieving feedback from Redis', { error });
      return [];
    }
  },

  /**
   * Clear all feedback entries from Redis
   */
  async clear(): Promise<number> {
    try {
      const keys = await SafeRedis.keys('feedback:*');
      
      if (keys.length === 0) {
        return 0;
      }

      let deleted = 0;
      for (const key of keys) {
        const success = await SafeRedis.del(key);
        if (success) {
          deleted++;
        }
      }
      
      logger.info('Feedback entries cleared from Redis', {
        count: keys.length,
        deleted,
      });

      return deleted;
    } catch (error) {
      logger.error('Error clearing feedback from Redis', { error });
      throw error;
    }
  },

  /**
   * Get feedback count
   */
  async count(): Promise<number> {
    try {
      const keys = await SafeRedis.keys('feedback:*');
      return keys.length;
    } catch (error) {
      logger.error('Error counting feedback entries', { error });
      return 0;
    }
  },
};

// Export redis client for use in other modules (use with caution)
export { redis };
export default redis;

