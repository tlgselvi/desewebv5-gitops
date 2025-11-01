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
        status: 'executed' as const,
      };
      remediator.recordEvent(event);

      // Act
      const history = remediator.getRemediationHistory();

      // Assert
      expect(Array.isArray(history)).toBe(true);
    });
  });
});

