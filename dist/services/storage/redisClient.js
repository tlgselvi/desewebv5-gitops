import Redis from 'ioredis';
import { logger } from '../../utils/logger.js';
// Redis connection
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
    retryStrategy: (times) => {
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
export const FeedbackStore = {
    /**
     * Save feedback entry to Redis
     */
    async save(entry) {
        try {
            const key = `feedback:${Date.now()}`;
            await redis.set(key, JSON.stringify(entry));
            await redis.expire(key, 60 * 60 * 24 * 7); // 7 days TTL
            logger.info('Feedback entry saved to Redis', {
                key,
                metric: entry.metric,
            });
        }
        catch (error) {
            logger.error('Error saving feedback to Redis', { error, entry });
            throw error;
        }
    },
    /**
     * Get all feedback entries from Redis
     */
    async getAll() {
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
                }
                catch {
                    return null;
                }
            })
                .filter((entry) => entry !== null);
            return data.sort((a, b) => b.timestamp - a.timestamp);
        }
        catch (error) {
            logger.error('Error retrieving feedback from Redis', { error });
            return [];
        }
    },
    /**
     * Clear all feedback entries from Redis
     */
    async clear() {
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
        }
        catch (error) {
            logger.error('Error clearing feedback from Redis', { error });
            throw error;
        }
    },
    /**
     * Get feedback count
     */
    async count() {
        try {
            const keys = await redis.keys('feedback:*');
            return keys.length;
        }
        catch (error) {
            logger.error('Error counting feedback entries', { error });
            return 0;
        }
    },
};
// Export redis client for use in other modules
export { redis };
export default redis;
//# sourceMappingURL=redisClient.js.map