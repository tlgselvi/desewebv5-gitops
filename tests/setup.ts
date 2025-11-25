import { beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import Redis from 'ioredis';
import { logger } from '@/utils/logger.js';

// Test environment variables
process.env.NODE_ENV = 'test';
// Use localhost for tests (not Docker service names)
process.env.REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
process.env.REDIS_HOST = 'localhost';
process.env.REDIS_PORT = '6379';
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://dese:dese123@localhost:5432/dese_ea_plan_v5_test';
process.env.DB_HOST = 'localhost';
process.env.DB_PORT = '5432';
process.env.DB_NAME = 'dese_ea_plan_v5_test';
process.env.DB_USER = 'dese';
process.env.DB_PASSWORD = 'dese123';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-key-min-32-chars-for-testing';

// Mock logger for tests to reduce noise
logger.info = () => {};
logger.error = () => {};
logger.warn = () => {};
logger.debug = () => {};

// Test Redis client
let testRedis: Redis | null = null;

beforeAll(async () => {
  // Initialize test Redis connection
  try {
    testRedis = new Redis(process.env.REDIS_URL!, {
      maxRetriesPerRequest: 1,
      retryStrategy: () => null, // Disable retries in tests
    });
    
    // Test connection
    await testRedis.ping();
  } catch (error) {
    console.warn('Redis not available for tests, skipping Redis-dependent tests');
    testRedis = null;
  }
});

afterAll(async () => {
  // Close Redis connection
  if (testRedis) {
    await testRedis.quit();
    testRedis = null;
  }
});

beforeEach(async () => {
  // Clean Redis before each test
  if (testRedis) {
    try {
      await testRedis.flushdb();
    } catch (error) {
      // Ignore errors if Redis is not available
    }
  }
});

afterEach(async () => {
  // Clean up after each test
  if (testRedis) {
    try {
      // Don't flush, just clean specific test keys
      const keys = await testRedis.keys('test:*');
      if (keys.length > 0) {
        await testRedis.del(...keys);
      }
    } catch (error) {
      // Ignore errors
    }
  }
});

// Export test utilities
export { testRedis };

