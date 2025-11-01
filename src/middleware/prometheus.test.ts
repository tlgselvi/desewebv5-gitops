import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Request, Response } from 'express';
import { metricsHandler, recordSeoAnalysis, recordContentGeneration, recordUserAction } from './prometheus.js';

describe('Prometheus Middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;

  beforeEach(() => {
    mockRequest = {
      method: 'GET',
      url: '/test',
    };

    mockResponse = {
      status: vi.fn().mockReturnThis(),
      set: vi.fn().mockReturnThis(),
      end: vi.fn(),
    };

    vi.clearAllMocks();
  });

  describe('metricsHandler', () => {
    it('should return Prometheus metrics', () => {
      // Act
      metricsHandler(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockResponse.set).toHaveBeenCalledWith('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
      expect(mockResponse.end).toHaveBeenCalled();
    });
  });

  describe('recordUserAction', () => {
    it('should record user action without throwing', () => {
      // Act & Assert
      expect(() => {
        recordUserAction('test_action');
      }).not.toThrow();
    });
  });

  describe('recordSeoAnalysis', () => {
    it('should record SEO analysis without throwing', () => {
      // Act & Assert
      expect(() => {
        recordSeoAnalysis('test-project-id', 'lighthouse');
      }).not.toThrow();
    });
  });

  describe('recordContentGeneration', () => {
    it('should record content generation without throwing', () => {
      // Act & Assert
      expect(() => {
        recordContentGeneration('test-project-id', 'blog_post');
      }).not.toThrow();
    });
  });
});

