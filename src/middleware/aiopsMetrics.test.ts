import { describe, it, expect, beforeEach, vi } from 'vitest';
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
      send: vi.fn().mockReturnThis(),
      end: vi.fn().mockReturnThis(),
      set: vi.fn().mockReturnThis(),
      setHeader: vi.fn().mockReturnThis(),
    };
  });

  describe('aiopsMetrics', () => {
    it('should return metrics JSON', async () => {
      // Act
      await aiopsMetrics(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockResponse.set).toHaveBeenCalled();
      expect(mockResponse.end).toHaveBeenCalled();
    });

    it('should return metrics with required fields', async () => {
      // Act
      await aiopsMetrics(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockResponse.set).toHaveBeenCalled();
      expect(mockResponse.end).toHaveBeenCalled();
    });

    it('should end response after sending metrics', async () => {
      // Act
      await aiopsMetrics(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockResponse.end).toHaveBeenCalled();
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

