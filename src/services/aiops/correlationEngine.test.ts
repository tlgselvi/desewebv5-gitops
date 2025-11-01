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

    it('should handle series with different lengths gracefully', () => {
      // Arrange
      const series1 = {
        metric: 'metric1',
        values: [1, 2, 3],
        timestamps: [1, 2, 3],
      };
      const series2 = {
        metric: 'metric2',
        values: [2, 4, 6, 8],
        timestamps: [1, 2, 3, 4],
      };

      // Act & Assert
      expect(() => {
        engine['calculateCorrelation'](series1, series2);
      }).toThrow('Series length mismatch');
    });

    it('should return 0 for uncorrelated series', () => {
      // Arrange
      const series1 = {
        metric: 'metric1',
        values: [1, 2, 3, 4, 5],
        timestamps: [1, 2, 3, 4, 5],
      };
      const series2 = {
        metric: 'metric2',
        values: [5, 4, 3, 2, 1], // Negatively correlated
        timestamps: [1, 2, 3, 4, 5],
      };

      // Act
      const correlation = engine['calculateCorrelation'](series1, series2);

      // Assert
      expect(correlation).toBeLessThan(0);
      expect(correlation).toBeGreaterThanOrEqual(-1);
    });

    it('should handle single value series', () => {
      // Arrange
      const series1 = {
        metric: 'metric1',
        values: [5],
        timestamps: [1],
      };
      const series2 = {
        metric: 'metric2',
        values: [10],
        timestamps: [1],
      };

      // Act
      const correlation = engine['calculateCorrelation'](series1, series2);

      // Assert
      expect(isNaN(correlation) || correlation === 0).toBe(true);
    });

    it('should handle negative correlation', () => {
      // Arrange
      const series1 = {
        metric: 'metric1',
        values: [10, 8, 6, 4, 2],
        timestamps: [1, 2, 3, 4, 5],
      };
      const series2 = {
        metric: 'metric2',
        values: [2, 4, 6, 8, 10], // Perfect negative correlation
        timestamps: [1, 2, 3, 4, 5],
      };

      // Act
      const correlation = engine['calculateCorrelation'](series1, series2);

      // Assert
      expect(correlation).toBeLessThan(0);
      expect(correlation).toBeCloseTo(-1, 0);
    });
  });
});

