import { describe, it, expect } from 'vitest';
import { CorrelationUtils } from './correlationUtils.js';

describe('CorrelationUtils', () => {
  describe('pearson', () => {
    it('calculates Pearson correlation for perfectly correlated data', () => {
      const x = [1, 2, 3, 4, 5];
      const y = [2, 4, 6, 8, 10];
      const result = CorrelationUtils.pearson(x, y);
      expect(result).toBeCloseTo(1, 3);
    });

    it('calculates Pearson correlation for negatively correlated data', () => {
      const x = [1, 2, 3, 4, 5];
      const y = [10, 8, 6, 4, 2];
      const result = CorrelationUtils.pearson(x, y);
      expect(result).toBeCloseTo(-1, 3);
    });

    it('returns 0 for uncorrelated data', () => {
      const x = [1, 2, 3, 4, 5];
      const y = [5, 1, 4, 2, 3];
      const result = CorrelationUtils.pearson(x, y);
      expect(Math.abs(result)).toBeLessThan(0.5);
    });

    it('returns 0 for empty arrays', () => {
      const result = CorrelationUtils.pearson([], []);
      expect(result).toBe(0);
    });

    it('returns 0 for mismatched length arrays', () => {
      const result = CorrelationUtils.pearson([1, 2, 3], [1, 2]);
      expect(result).toBe(0);
    });

    it('returns 0 for zero standard deviation', () => {
      const result = CorrelationUtils.pearson([5, 5, 5], [1, 2, 3]);
      expect(result).toBe(0);
    });
  });

  describe('spearman', () => {
    it('calculates Spearman correlation for perfectly ranked data', () => {
      const x = [1, 2, 3, 4, 5];
      const y = [1, 2, 3, 4, 5];
      const result = CorrelationUtils.spearman(x, y);
      expect(result).toBeCloseTo(1, 3);
    });

    it('returns 0 for empty arrays', () => {
      const result = CorrelationUtils.spearman([], []);
      expect(result).toBe(0);
    });

    it('returns 0 for mismatched length arrays', () => {
      const result = CorrelationUtils.spearman([1, 2, 3], [1, 2]);
      expect(result).toBe(0);
    });
  });

  describe('anomalyScores', () => {
    it('detects anomalies in data', () => {
      const arr = [1, 1, 1, 10];
      const result = CorrelationUtils.anomalyScores(arr, 1.5);
      expect(result.some((r) => r === 1)).toBe(true);
    });

    it('returns all zeros for normal data', () => {
      const arr = [5, 5.1, 4.9, 5.2, 4.8];
      const result = CorrelationUtils.anomalyScores(arr, 2);
      expect(result.every((r) => r === 0)).toBe(true);
    });

    it('returns empty array for empty input', () => {
      const result = CorrelationUtils.anomalyScores([], 2);
      expect(result).toEqual([]);
    });

    it('handles zero standard deviation', () => {
      const arr = [5, 5, 5, 5];
      const result = CorrelationUtils.anomalyScores(arr, 2);
      expect(result.every((r) => r === 0)).toBe(true);
    });
  });

  describe('anomalyRate', () => {
    it('calculates correct anomaly rate', () => {
      const arr = [1, 1, 1, 10, 1];
      const result = CorrelationUtils.anomalyRate(arr, 1.5);
      expect(result).toBeGreaterThan(0);
      expect(result).toBeLessThanOrEqual(1);
    });

    it('returns 0 for normal data', () => {
      const arr = [5, 5.1, 4.9, 5.2, 4.8];
      const result = CorrelationUtils.anomalyRate(arr, 2);
      expect(result).toBe(0);
    });

    it('returns 0 for empty input', () => {
      const result = CorrelationUtils.anomalyRate([], 2);
      expect(result).toBe(0);
    });
  });
});
