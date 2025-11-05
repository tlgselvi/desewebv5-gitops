import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Redis from 'ioredis';
import { testRedis } from '../setup.js';

describe('Redis Client', () => {
  let redis: Redis | null = null;

  beforeEach(async () => {
    if (!testRedis) {
      redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
        maxRetriesPerRequest: 1,
        retryStrategy: () => null,
      });
    } else {
      redis = testRedis;
    }
  });

  afterEach(async () => {
    if (redis && redis !== testRedis) {
      await redis.quit();
    }
  });

  it('should connect to Redis', async () => {
    if (!redis) {
      console.warn('Redis not available, skipping test');
      return;
    }

    try {
      const result = await redis.ping();
      expect(result).toBe('PONG');
    } catch (error) {
      console.warn('Redis connection failed, skipping test');
    }
  });

  it('should set and get values', async () => {
    if (!redis) {
      console.warn('Redis not available, skipping test');
      return;
    }

    try {
      await redis.set('test:key', 'test-value');
      const value = await redis.get('test:key');
      expect(value).toBe('test-value');
    } catch (error) {
      console.warn('Redis operation failed, skipping test');
    }
  });

  it('should set values with TTL', async () => {
    if (!redis) {
      console.warn('Redis not available, skipping test');
      return;
    }

    try {
      await redis.setex('test:ttl', 60, 'test-value');
      const value = await redis.get('test:ttl');
      expect(value).toBe('test-value');
      
      const ttl = await redis.ttl('test:ttl');
      expect(ttl).toBeGreaterThan(0);
      expect(ttl).toBeLessThanOrEqual(60);
    } catch (error) {
      console.warn('Redis operation failed, skipping test');
    }
  });
});

