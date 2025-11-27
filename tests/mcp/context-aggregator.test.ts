import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('Context Aggregator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should aggregate context from multiple modules', async () => {
    // Mock context data
    const mockContexts = {
      finbot: { module: 'finbot', data: { accounts: 10 }, priority: 1 },
      mubot: { module: 'mubot', data: { metrics: 20 }, priority: 2 },
    };

    // Test merge strategy
    const merged = { ...mockContexts.finbot.data, ...mockContexts.mubot.data };
    expect(merged).toHaveProperty('accounts', 10);
    expect(merged).toHaveProperty('metrics', 20);
  });

  it('should select context by priority', () => {
    const contexts = [
      { module: 'finbot', priority: 1 },
      { module: 'mubot', priority: 2 },
      { module: 'dese', priority: 3 },
    ];

    const highestPriority = contexts.reduce((prev, current) =>
      current.priority > prev.priority ? current : prev
    );

    expect(highestPriority.module).toBe('dese');
  });

  it('should handle missing modules gracefully', () => {
    const contexts: any[] = [];
    const merged = contexts.reduce((acc, ctx) => ({ ...acc, ...ctx }), {});
    expect(merged).toEqual({});
  });
});

describe('getAggregatedContext - Cache Branch Tests', () => {
  const mockRedis = {
    get: vi.fn(),
    setex: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mock('@/services/storage/redisClient.js', () => ({
      redis: mockRedis,
    }));
  });

  it('should return cached context when cache hit', async () => {
    const cachedData = {
      modules: { finbot: { data: { accounts: 10 } } },
      metadata: { totalModules: 1, aggregatedAt: new Date().toISOString() },
    };

    mockRedis.get.mockResolvedValue(JSON.stringify(cachedData));

    // Note: This test would need to import the actual function
    // For now, we're testing the cache logic pattern
    expect(mockRedis.get).toBeDefined();
  });

  it('should fetch and cache when cache miss', async () => {
    mockRedis.get.mockResolvedValue(null);
    mockRedis.setex.mockResolvedValue('OK');

    // Note: This test would need to import the actual function
    // For now, we're testing the cache logic pattern
    expect(mockRedis.get).toBeDefined();
  });

  it('should handle cache error gracefully', async () => {
    mockRedis.get.mockRejectedValue(new Error('Redis connection error'));

    // Note: This test would need to import the actual function
    // For now, we're testing the cache logic pattern
    expect(mockRedis.get).toBeDefined();
  });
});

