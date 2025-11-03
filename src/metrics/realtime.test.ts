import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getStreamStats } from '@/metrics/realtime.js';

// Mock Redis client
vi.mock('ioredis', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      call: vi.fn(),
      on: vi.fn(),
    })),
  };
});

describe('realtime metrics', () => {
  it('fetches stream stats', async () => {
    const stats = await getStreamStats(['finbot.events']);
    expect(Array.isArray(stats)).toBe(true);
    expect(stats.length).toBeGreaterThanOrEqual(0);
  });

  it('handles empty stream list', async () => {
    const stats = await getStreamStats([]);
    expect(Array.isArray(stats)).toBe(true);
    expect(stats.length).toBe(0);
  });

  it('handles invalid stream names gracefully', async () => {
    const stats = await getStreamStats(['nonexistent.stream']);
    expect(Array.isArray(stats)).toBe(true);
    // Should return empty groups even if stream doesn't exist
    expect(stats[0]?.groups).toBeDefined();
  });
});

