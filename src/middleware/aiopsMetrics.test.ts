import { describe, it, expect, beforeEach } from 'vitest';
import { Request, Response } from 'express';
import { aiopsMetrics, recordFeedback } from './aiopsMetrics.js';

describe('AIOpsMetrics Middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;

  beforeEach(() => {
    mockRequest = {
      method: 'GET',
      url: '/metrics/aiops',
    };

    mockResponse = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };
  });

  describe('aiopsMetrics', () => {
    it('should return metrics JSON', () => {
      // Act
      aiopsMetrics(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalled();
    });

    it('should return metrics with required fields', () => {
      // Act
      aiopsMetrics(mockRequest as Request, mockResponse as Response);

      // Assert
      const callArg = (mockResponse.json as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(callArg).toHaveProperty('anomalyCount');
      expect(callArg).toHaveProperty('correlationAccuracy');
      expect(callArg).toHaveProperty('remediationSuccess');
    });
  });

  describe('recordFeedback', () => {
    it('should record feedback without throwing', () => {
      // Act & Assert
      expect(() => {
        recordFeedback('positive', {});
      }).not.toThrow();
    });
  });
});

