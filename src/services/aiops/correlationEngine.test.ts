import { describe, it, expect, beforeEach, vi } from 'vitest';
import CorrelationEngine from './correlationEngine.js';

describe('CorrelationEngine Service', () => {
  let engine: CorrelationEngine;

  beforeEach(() => {
    engine = new CorrelationEngine();
  });

  describe('calculateCorrelation', () => {
    it('should return correlation coefficient between -1 and 1', () => {
      // Arrange
      const series1 = {
        metric: 'cpu',
        values: [1, 2, 3, 4, 5],
        timestamps: [1, 2, 3, 4, 5],
      };
      const series2 = {
        metric: 'memory',
        values: [2, 4, 6, 8, 10],
        timestamps: [1, 2, 3, 4, 5],
      };

      // Act
      const correlation = engine['calculateCorrelation'](series1, series2);

      // Assert
      expect(typeof correlation).toBe('number');
      expect(correlation).toBeGreaterThanOrEqual(-1);
      expect(correlation).toBeLessThanOrEqual(1);
    });

    it('should return 1 for perfectly correlated series', () => {
      // Arrange
      const series1 = {
        metric: 'metric1',
        values: [1, 2, 3, 4, 5],
        timestamps: [1, 2, 3, 4, 5],
      };
      const series2 = {
        metric: 'metric2',
        values: [2, 4, 6, 8, 10], // Perfectly correlated (2x)
        timestamps: [1, 2, 3, 4, 5],
      };

      // Act
      const correlation = engine['calculateCorrelation'](series1, series2);

      // Assert
      expect(correlation).toBeCloseTo(1, 1);
    });

    it('should return NaN when series have no variance', () => {
      // Arrange
      const series1 = {
        metric: 'metric1',
        values: [5, 5, 5, 5, 5],
        timestamps: [1, 2, 3, 4, 5],
      };
      const series2 = {
        metric: 'metric2',
        values: [10, 10, 10, 10, 10],
        timestamps: [1, 2, 3, 4, 5],
      };

      // Act
      const correlation = engine['calculateCorrelation'](series1, series2);

      // Assert
      expect(isNaN(correlation)).toBe(true);
    });
  });
});

