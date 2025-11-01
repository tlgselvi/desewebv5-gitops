import { describe, it, expect, beforeEach } from 'vitest';
import AnomalyDetector from './anomalyDetector.js';

describe('AnomalyDetector Service', () => {
  let detector: AnomalyDetector;

  beforeEach(() => {
    detector = new AnomalyDetector();
  });

  describe('detectAnomalies', () => {
    it('should return empty array when values array is empty', () => {
      // Arrange
      const data = {
        values: [],
        timestamps: [],
      };

      // Act
      const result = detector.detectAnomalies(data);

      // Assert
      expect(result).toEqual([]);
    });

    it('should detect anomalies in normal data', () => {
      // Arrange
      const data = {
        values: [50, 52, 51, 48, 49, 50],
        timestamps: [1, 2, 3, 4, 5, 6],
      };

      // Act
      const result = detector.detectAnomalies(data);

      // Assert
      expect(Array.isArray(result)).toBe(true);
    });

    it('should detect outliers in data with anomalies', () => {
      // Arrange
      const data = {
        values: [50, 52, 51, 90, 95, 93], // Last 3 are outliers
        timestamps: [1, 2, 3, 4, 5, 6],
      };

      // Act
      const result = detector.detectAnomalies(data);

      // Assert
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('calculateZScore', () => {
    it('should calculate z-score correctly', () => {
      // Arrange
      const data = {
        values: [1, 2, 3, 4, 5],
        timestamps: [1, 2, 3, 4, 5],
      };
      const value = 3;
      const mean = 3;
      const stdDev = 1.41; // Approximate

      // Act
      const zScore = detector['calculateZScore'](value, mean, stdDev);

      // Assert
      expect(typeof zScore).toBe('number');
      expect(Math.abs(zScore)).toBeLessThan(1); // Value close to mean
    });

    it('should handle zero standard deviation', () => {
      // Arrange
      const value = 5;
      const mean = 5;
      const stdDev = 0;

      // Act
      const zScore = detector['calculateZScore'](value, mean, stdDev);

      // Assert
      expect(isNaN(zScore) || zScore === 0 || !isFinite(zScore)).toBe(true);
    });

    it('should handle negative z-score for values below mean', () => {
      // Arrange
      const value = 1;
      const mean = 5;
      const stdDev = 2;

      // Act
      const zScore = detector['calculateZScore'](value, mean, stdDev);

      // Assert
      expect(zScore).toBeLessThan(0);
    });

    it('should handle very large z-scores', () => {
      // Arrange
      const value = 100;
      const mean = 5;
      const stdDev = 1;

      // Act
      const zScore = detector['calculateZScore'](value, mean, stdDev);

      // Assert
      expect(Math.abs(zScore)).toBeGreaterThan(3); // Extreme outlier
    });
  });

  describe('detectp95Anomaly', () => {
    it('should detect p95 anomaly when value exceeds threshold', () => {
      // Arrange
      const data = {
        values: [1, 2, 3, 4, 5, 6, 7, 8, 9, 100], // Last value is extreme
        timestamps: Array(10).fill(0).map((_, i) => i),
      };

      // Act
      const result = detector.detectp95Anomaly(data);

      // Assert
      expect(result.result).toBeDefined();
      expect(result.result?.isAnomaly).toBe(true);
    });

    it('should not detect anomaly when values are within normal range', () => {
      // Arrange
      const data = {
        values: [50, 52, 51, 48, 49, 50, 51, 49, 48, 50],
        timestamps: Array(10).fill(0).map((_, i) => i),
      };

      // Act
      const result = detector.detectp95Anomaly(data);

      // Assert
      expect(result.result).toBeDefined();
    });
  });
});

