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

    it('should handle different content types', () => {
      // Act & Assert
      expect(() => {
        recordContentGeneration('project-1', 'blog_post');
        recordContentGeneration('project-1', 'article');
        recordContentGeneration('project-1', 'social_media');
      }).not.toThrow();
    });
  });

  describe('recordSeoAnalysis', () => {
    it('should handle different analysis types', () => {
      // Act & Assert
      expect(() => {
        recordSeoAnalysis('project-1', 'lighthouse');
        recordSeoAnalysis('project-1', 'ahrefs');
        recordSeoAnalysis('project-1', 'gsc');
      }).not.toThrow();
    });
  });

  describe('recordUserAction', () => {
    it('should handle different action types', () => {
      // Act & Assert
      expect(() => {
        recordUserAction('login');
        recordUserAction('logout');
        recordUserAction('create_project');
        recordUserAction('delete_project');
      }).not.toThrow();
    });
  });

  describe('metricsHandler', () => {
    it('should handle requests without throwing', () => {
      // Act & Assert
      expect(() => {
        metricsHandler(mockRequest as Request, mockResponse as Response);
      }).not.toThrow();
    });

    it('should set correct content type header', () => {
      // Act
      metricsHandler(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockResponse.set).toHaveBeenCalledWith(
        'Content-Type',
        'text/plain; version=0.0.4; charset=utf-8'
      );
    });

    it('should end response after sending metrics', () => {
      // Act
      metricsHandler(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockResponse.end).toHaveBeenCalled();
    });
  });
});

