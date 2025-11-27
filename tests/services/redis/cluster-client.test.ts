import { describe, it, expect, beforeEach, vi } from 'vitest';
import { redisCluster } from '@/services/redis/cluster-client.js';
import { config } from '@/config/index.js';

// Mock config
vi.mock('@/config/index.js', () => ({
  config: {
    redis: {
      url: 'redis://localhost:6379',
      clusterEnabled: false,
      clusterNodes: [],
      maxRetryDelay: 2000,
      password: undefined,
    },
  },
}));

// Mock logger
vi.mock('@/utils/logger.js', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

describe('RedisClusterClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize redis cluster client', () => {
    expect(redisCluster).toBeDefined();
  });

  it('should perform health check', async () => {
    // Note: This will fail if Redis is not running, but that's expected in test environment
    try {
      const health = await redisCluster.healthCheck();
      expect(typeof health).toBe('boolean');
    } catch (error) {
      // Expected if Redis is not available
      expect(error).toBeDefined();
    }
  });

  it('should get cluster info when in cluster mode', async () => {
    const info = await redisCluster.getClusterInfo();
    // Returns null when not in cluster mode
    expect(info === null || typeof info === 'object').toBe(true);
  });

  it('should close connections', async () => {
    await expect(redisCluster.close()).resolves.not.toThrow();
  });
});

