import Redis from 'ioredis';
import { logger } from '../../utils/logger';

// Redis connection
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  retryStrategy: (times: number) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  maxRetriesPerRequest: 3,
});

redis.on('error', (err) => {
  logger.error('Redis connection error', { error: err });
});

redis.on('connect', () => {
  logger.info('Redis connected successfully');
});

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
      await redis.set(key, JSON.stringify(entry));
      await redis.expire(key, 60 * 60 * 24 * 7); // 7 days TTL
      
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
      const keys = await redis.keys('feedback:*');
      
      if (keys.length === 0) {
        return [];
      }

      const values = await redis.mget(...keys);
      const data = values
        .map((value) => {
          try {
            return value ? JSON.parse(value) : null;
          } catch {
            return null;
          }
        })
        .filter((entry): entry is FeedbackEntry => entry !== null);

      return data.sort((a, b) => b.timestamp - a.timestamp);
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
      const keys = await redis.keys('feedback:*');
      
      if (keys.length === 0) {
        return 0;
      }

      const deleted = await redis.del(...keys);
      
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
      const keys = await redis.keys('feedback:*');
      return keys.length;
    } catch (error) {
      logger.error('Error counting feedback entries', { error });
      return 0;
    }
  },
};

/**
 * Check Redis connection health
 */
export async function checkRedisConnection(): Promise<boolean> {
  try {
    const result = await redis.ping();
    return result === 'PONG';
  } catch (error) {
    logger.error('Redis health check failed', { error });
    return false;
  }
}

// Export redis client for use in other modules
export { redis };
export default redis;

