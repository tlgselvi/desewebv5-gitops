import { describe, it, expect, beforeEach, vi } from 'vitest';
import fs from 'fs';
import { AutoRemediator } from './autoRemediator.js';

describe('AutoRemediator Service', () => {
  let remediator: AutoRemediator;

  beforeEach(() => {
    vi.clearAllMocks();
    remediator = new AutoRemediator('test-logs');
  });

  describe('recordEvent', () => {
    it('should record remediation event', () => {
      // Arrange
      const event = {
        timestamp: Date.now(),
        metric: 'cpu_usage',
        action: 'scale_up',
        status: 'executed' as const,
      };

      // Act & Assert
      expect(() => {
        remediator.recordEvent(event);
      }).not.toThrow();
    });

    it('should handle different event statuses', () => {
      // Arrange
      const events = [
        { timestamp: Date.now(), metric: 'test', action: 'test', status: 'executed' as const },
        { timestamp: Date.now(), metric: 'test', action: 'test', status: 'pending' as const },
        { timestamp: Date.now(), metric: 'test', action: 'test', status: 'failed' as const },
      ];

      // Act & Assert
      events.forEach(event => {
        expect(() => {
          remediator.recordEvent(event);
        }).not.toThrow();
      });
    });
  });

  describe('getRemediationHistory', () => {
    it('should return remediation history', () => {
      // Arrange
      const event = {
        timestamp: Date.now(),
        metric: 'cpu_usage',
        action: 'scale_up',
        severity: 'high' as const,
        status: 'executed' as const,
      };
      remediator.recordEvent(event);

      // Act
      const history = remediator.getRemediationHistory();

      // Assert
      expect(Array.isArray(history)).toBe(true);
    });

    it('should limit history to specified count', () => {
      // Arrange
      for (let i = 0; i < 15; i++) {
        remediator.recordEvent({
          timestamp: Date.now() + i,
          metric: `metric_${i}`,
          action: 'test',
          severity: 'low' as const,
          status: 'executed' as const,
        });
      }

      // Act
      const history = remediator.getRemediationHistory(10);

      // Assert
      expect(history.length).toBeLessThanOrEqual(10);
    });
  });

  describe('suggestAction', () => {
    it('should suggest restart for high severity', () => {
      // Arrange
      const metric = 'cpu_usage';
      const severity = 'high';

      // Act
      const action = remediator.suggestAction(metric, severity);

      // Assert
      expect(action).toContain('Restart');
      expect(action).toContain(metric);
    });

    it('should suggest scale for medium severity', () => {
      // Arrange
      const metric = 'memory_usage';
      const severity = 'medium';

      // Act
      const action = remediator.suggestAction(metric, severity);

      // Assert
      expect(action).toContain('Scale');
      expect(action).toContain(metric);
    });

    it('should suggest monitor for low severity', () => {
      // Arrange
      const metric = 'network_latency';
      const severity = 'low';

      // Act
      const action = remediator.suggestAction(metric, severity);

      // Assert
      expect(action).toContain('Monitor');
      expect(action).toContain(metric);
    });
  });

  describe('replay', () => {
    it('should return empty array when log file does not exist', () => {
      // Arrange
      const newRemediator = new AutoRemediator('non-existent-logs');

      // Act
      const events = newRemediator.replay();

      // Assert
      expect(Array.isArray(events)).toBe(true);
      expect(events.length).toBe(0);
    });

    it('should limit replay to last 50 events', () => {
      // Arrange
      for (let i = 0; i < 60; i++) {
        remediator.recordEvent({
          timestamp: Date.now() + i,
          metric: `metric_${i}`,
          action: 'test',
          severity: 'low' as const,
          status: 'executed' as const,
        });
      }

      // Act
      const events = remediator.replay();

      // Assert
      expect(events.length).toBeLessThanOrEqual(50);
    });
  });
});

