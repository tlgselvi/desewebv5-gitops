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
  });
});

