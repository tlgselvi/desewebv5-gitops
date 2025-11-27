import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import Redis from 'ioredis';
import { RedisContainer, StartedRedisContainer } from 'testcontainers';

describe('Redis Client', () => {
  let container: StartedRedisContainer | null = null;
  let redis: Redis | null = null;
  let redisUrl: string | null = null;

  // Start a Redis container once before all tests
  beforeAll(async () => {
    try {
      container = await new RedisContainer().start();
      const host = container.getHost();
      const port = container.getMappedPort(6379);
      redisUrl = `redis://${host}:${port}`;
    } catch (error) {
      console.warn('Could not start Redis container, skipping tests.', error);
    }
  }, 30000); // 30s timeout for container startup

  beforeEach(async () => {
    if (redisUrl) {
      redis = new Redis(redisUrl, {
        maxRetriesPerRequest: 1,
        retryStrategy: () => null,
      });
    }
  });

  afterEach(async () => {
    if (redis) {
      await redis.quit();
    }
  });

  // Stop the container after all tests are finished
  afterAll(async () => {
    if (container) {
      await container.stop();
    }
  });

  it('should connect to Redis', async ({ skip }) => {
    if (!redis) return skip('Redis container not available');
    const result = await redis.ping();
    expect(result).toBe('PONG');
  });

  it('should set and get values', async ({ skip }) => {
    if (!redis) return skip('Redis container not available');
    await redis.set('test:key', 'test-value');
    const value = await redis.get('test:key');
    expect(value).toBe('test-value');
  });

  it('should set values with TTL', async ({ skip }) => {
    if (!redis) return skip('Redis container not available');
    await redis.setex('test:ttl', 60, 'test-value');
    const value = await redis.get('test:ttl');
    expect(value).toBe('test-value');
    const ttl = await redis.ttl('test:ttl');
    expect(ttl).toBeGreaterThan(0);
    expect(ttl).toBeLessThanOrEqual(60);
  });

  it('should handle cache hit scenario', async ({ skip }) => {
    if (!redis) return skip('Redis container not available');
    await redis.set('test:cache', 'cached-value');
    const value = await redis.get('test:cache');
    expect(value).toBe('cached-value');
  });

  it('should handle cache miss scenario', async ({ skip }) => {
    if (!redis) return skip('Redis container not available');
    const value = await redis.get('test:non-existent');
    expect(value).toBeNull();
  });

  it('should handle cache expiration', async ({ skip }) => {
    if (!redis) return skip('Redis container not available');
    await redis.setex('test:expire', 1, 'expiring-value');
    const value1 = await redis.get('test:expire');
    expect(value1).toBe('expiring-value');
    
    // Wait for expiration
    await new Promise(resolve => setTimeout(resolve, 1100));
    
    const value2 = await redis.get('test:expire');
    expect(value2).toBeNull();
  }, 5000);

  it('should handle cache error gracefully', async ({ skip }) => {
    if (!redis) return skip('Redis container not available');
    // Test with invalid operation
    try {
      await redis.get(null as any);
    } catch (error) {
      expect(error).toBeDefined();
    }
  });
});
