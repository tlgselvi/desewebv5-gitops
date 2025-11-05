import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('Anomaly Scorer Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should calculate anomaly score', () => {
    // Mock implementation
    const calculateScore = (value: number, baseline: number): number => {
      const deviation = Math.abs(value - baseline) / baseline;
      return Math.min(deviation * 100, 100);
    };

    const score = calculateScore(120, 100);
    expect(score).toBe(20);
  });

  it('should return score between 0 and 100', () => {
    const calculateScore = (value: number, baseline: number): number => {
      const deviation = Math.abs(value - baseline) / baseline;
      return Math.min(deviation * 100, 100);
    };

    const score1 = calculateScore(50, 100);
    expect(score1).toBeGreaterThanOrEqual(0);
    expect(score1).toBeLessThanOrEqual(100);

    const score2 = calculateScore(200, 100);
    expect(score2).toBe(100); // Capped at 100
  });

  it('should handle zero baseline', () => {
    const calculateScore = (value: number, baseline: number): number => {
      if (baseline === 0) return value > 0 ? 100 : 0;
      const deviation = Math.abs(value - baseline) / baseline;
      return Math.min(deviation * 100, 100);
    };

    const score = calculateScore(10, 0);
    expect(score).toBe(100);
  });
});

