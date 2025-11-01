import { describe, it, expect, beforeEach, vi } from 'vitest';
import PredictiveRemediator, { SeverityLevel } from './predictiveRemediator.js';
import CorrelationEngine from './correlationEngine.js';

describe('PredictiveRemediator Service', () => {
  let remediator: PredictiveRemediator;
  let mockCorrelationEngine: CorrelationEngine;

  beforeEach(() => {
    mockCorrelationEngine = {
      predictMetricImpact: vi.fn(),
    } as unknown as CorrelationEngine;
    remediator = new PredictiveRemediator(mockCorrelationEngine);
  });

  describe('classifySeverity', () => {
    it('should classify as CRITICAL when composite score is high', () => {
      // Arrange
      const features = {
        correlationScore: 0.9,
        anomalyScore: 0.95,
        trendDirection: 0.2,
        remarks: '',
      };

      // Act
      const result = remediator.classifySeverity(features);

      // Assert
      expect(result.severity).toBe(SeverityLevel.CRITICAL);
      expect(result.confidence).toBeGreaterThanOrEqual(0.95);
      expect(result.recommendedAction).toContain('Immediate');
    });

    it('should classify as LOW when composite score is low', () => {
      // Arrange
      const features = {
        correlationScore: 0.2,
        anomalyScore: 0.3,
        trendDirection: 0.8,
        remarks: '',
      };

      // Act
      const result = remediator.classifySeverity(features);

      // Assert
      expect(result.severity).toBe(SeverityLevel.LOW);
      expect(result.confidence).toBeGreaterThanOrEqual(0.65);
    });

    it('should increase confidence when data quality is high', () => {
      // Arrange
      const features = {
        correlationScore: 0.85,
        anomalyScore: 0.85,
        trendDirection: 0.5,
        remarks: '',
      };

      // Act
      const result = remediator.classifySeverity(features);

      // Assert
      expect(result.confidence).toBeGreaterThan(0.85);
      expect(result.reasoning).toContain('High data quality');
    });
  });

  describe('calculateConfidence', () => {
    it('should return confidence >= 0.5', () => {
      // Arrange
      const features = {
        correlationScore: 0.3,
        anomalyScore: 0.2,
        trendDirection: 0.1,
        remarks: '',
      };

      // Act
      const confidence = remediator.calculateConfidence(features);

      // Assert
      expect(confidence).toBeGreaterThanOrEqual(0.5);
      expect(confidence).toBeLessThanOrEqual(1.0);
    });

    it('should return higher confidence for strong correlations', () => {
      // Arrange
      const features1 = {
        correlationScore: 0.9,
        anomalyScore: 0.8,
        trendDirection: 0.5,
        remarks: '',
      };
      const features2 = {
        correlationScore: 0.3,
        anomalyScore: 0.3,
        trendDirection: 0.5,
        remarks: '',
      };

      // Act
      const confidence1 = remediator.calculateConfidence(features1);
      const confidence2 = remediator.calculateConfidence(features2);

      // Assert
      expect(confidence1).toBeGreaterThan(confidence2);
    });
  });

  describe('prioritizeRemediations', () => {
    it('should sort actions by priority descending', () => {
      // Arrange
      const actions = [
        { action: 'low', priority: 3, confidence: 0.7, estimatedImpact: 20, riskLevel: 'low' as const },
        { action: 'high', priority: 9, confidence: 0.8, estimatedImpact: 50, riskLevel: 'high' as const },
        { action: 'medium', priority: 5, confidence: 0.75, estimatedImpact: 30, riskLevel: 'medium' as const },
      ];

      // Act
      const prioritized = remediator.prioritizeRemediations(actions);

      // Assert
      expect(prioritized[0].priority).toBe(9);
      expect(prioritized[1].priority).toBe(5);
      expect(prioritized[2].priority).toBe(3);
    });
  });
});

