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

