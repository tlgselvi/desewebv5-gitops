import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response } from 'express';
import { SeoController } from '@/modules/seo/controller.js';
import { seoService } from '@/modules/seo/service.js';
import { CustomError } from '@/middleware/errorHandler.js';

// Mock dependencies
vi.mock('@/modules/seo/service.js', () => ({
  seoService: {
    analyzeProject: vi.fn(),
    getProjectMetrics: vi.fn(),
    getProjectTrends: vi.fn(),
    analyzeUrl: vi.fn(),
  },
}));

describe('SEO Controller', () => {
  let controller: SeoController;
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;

  beforeEach(() => {
    vi.clearAllMocks();
    controller = new SeoController();

    mockReq = {
      params: {},
      query: {},
      body: {},
      user: {
        id: 'user-1',
        organizationId: 'org-1',
        email: 'test@example.com',
        role: 'user',
      } as any,
    };

    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };
  });

  describe('analyze', () => {
    it('should return 400 when organizationId is missing', async () => {
      mockReq.user = { id: 'user-1' } as any; // No organizationId

      await controller.analyze(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Organization context required',
      });
    });

    it('should return 400 when validation fails', async () => {
      mockReq.body = {
        projectId: 'invalid-uuid', // Invalid UUID
        urls: ['not-a-url'], // Invalid URL
      };

      await controller.analyze(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should analyze project successfully', async () => {
      mockReq.body = {
        projectId: '550e8400-e29b-41d4-a716-446655440000',
        urls: ['https://example.com'],
      };

      const mockResult = {
        projectId: '550e8400-e29b-41d4-a716-446655440000',
        totalUrls: 1,
        successfulAnalyses: 1,
        failedAnalyses: 0,
        results: [],
        errors: [],
      };
      vi.mocked(seoService.analyzeProject).mockResolvedValue(mockResult);

      await controller.analyze(mockReq as Request, mockRes as Response);

      expect(seoService.analyzeProject).toHaveBeenCalledWith(
        expect.objectContaining({
          projectId: '550e8400-e29b-41d4-a716-446655440000',
          urls: ['https://example.com'],
        }),
        'org-1'
      );
      expect(mockRes.json).toHaveBeenCalledWith(mockResult);
    });

    it('should handle service errors', async () => {
      mockReq.body = {
        projectId: '550e8400-e29b-41d4-a716-446655440000',
        urls: ['https://example.com'],
      };

      vi.mocked(seoService.analyzeProject).mockRejectedValue(
        new Error('Project not found')
      );

      await controller.analyze(mockReq as Request, mockRes as Response);

      // Error should be caught by asyncHandler middleware
      expect(seoService.analyzeProject).toHaveBeenCalled();
    });
  });

  describe('getMetrics', () => {
    it('should return 400 when organizationId is missing', async () => {
      mockReq.user = { id: 'user-1' } as any; // No organizationId
      mockReq.query = {
        projectId: '550e8400-e29b-41d4-a716-446655440000',
        limit: '10',
      };

      await controller.getMetrics(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should return metrics successfully', async () => {
      mockReq.query = {
        projectId: '550e8400-e29b-41d4-a716-446655440000',
        limit: '10',
      };

      const mockMetrics = [
        {
          id: 'metric-1',
          projectId: '550e8400-e29b-41d4-a716-446655440000',
          performance: '85.5',
          seo: '90.0',
        },
      ];
      vi.mocked(seoService.getProjectMetrics).mockResolvedValue(mockMetrics);

      await controller.getMetrics(mockReq as Request, mockRes as Response);

      expect(seoService.getProjectMetrics).toHaveBeenCalledWith(
        '550e8400-e29b-41d4-a716-446655440000',
        'org-1',
        10
      );
      expect(mockRes.json).toHaveBeenCalledWith({ metrics: mockMetrics });
    });

    it('should use default limit when not provided', async () => {
      mockReq.query = {
        projectId: '550e8400-e29b-41d4-a716-446655440000',
      };

      vi.mocked(seoService.getProjectMetrics).mockResolvedValue([]);

      await controller.getMetrics(mockReq as Request, mockRes as Response);

      expect(seoService.getProjectMetrics).toHaveBeenCalledWith(
        '550e8400-e29b-41d4-a716-446655440000',
        'org-1',
        10
      );
    });

    it('should validate limit range', async () => {
      mockReq.query = {
        projectId: '550e8400-e29b-41d4-a716-446655440000',
        limit: '200', // Exceeds max of 100
      };

      await controller.getMetrics(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });
  });

  describe('getTrends', () => {
    it('should return 400 when organizationId is missing', async () => {
      mockReq.user = { id: 'user-1' } as any; // No organizationId
      mockReq.query = {
        projectId: '550e8400-e29b-41d4-a716-446655440000',
        days: '30',
      };

      await controller.getTrends(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should return trends successfully', async () => {
      mockReq.query = {
        projectId: '550e8400-e29b-41d4-a716-446655440000',
        days: '30',
      };

      const mockTrends = {
        projectId: '550e8400-e29b-41d4-a716-446655440000',
        period: '30 days',
        metrics: [],
        trends: null,
      };
      vi.mocked(seoService.getProjectTrends).mockResolvedValue(mockTrends);

      await controller.getTrends(mockReq as Request, mockRes as Response);

      expect(seoService.getProjectTrends).toHaveBeenCalledWith(
        '550e8400-e29b-41d4-a716-446655440000',
        'org-1',
        30
      );
      expect(mockRes.json).toHaveBeenCalledWith(mockTrends);
    });

    it('should use default days when not provided', async () => {
      mockReq.query = {
        projectId: '550e8400-e29b-41d4-a716-446655440000',
      };

      vi.mocked(seoService.getProjectTrends).mockResolvedValue({
        projectId: '550e8400-e29b-41d4-a716-446655440000',
        period: '30 days',
        metrics: [],
        trends: null,
      });

      await controller.getTrends(mockReq as Request, mockRes as Response);

      expect(seoService.getProjectTrends).toHaveBeenCalledWith(
        '550e8400-e29b-41d4-a716-446655440000',
        'org-1',
        30
      );
    });

    it('should validate days range', async () => {
      mockReq.query = {
        projectId: '550e8400-e29b-41d4-a716-446655440000',
        days: '500', // Exceeds max of 365
      };

      await controller.getTrends(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });
  });

  describe('analyzeUrl', () => {
    it('should analyze URL successfully', async () => {
      mockReq.body = {
        url: 'https://example.com',
      };

      const mockResult = {
        url: 'https://example.com',
        scores: { performance: 85, seo: 90 },
        coreWebVitals: {},
        opportunities: [],
        diagnostics: [],
        rawData: {},
        analyzedAt: new Date().toISOString(),
      };
      vi.mocked(seoService.analyzeUrl).mockResolvedValue(mockResult);

      await controller.analyzeUrl(mockReq as Request, mockRes as Response);

      expect(seoService.analyzeUrl).toHaveBeenCalledWith(
        'https://example.com',
        undefined
      );
      expect(mockRes.json).toHaveBeenCalledWith(mockResult);
    });

    it('should return 400 when URL is invalid', async () => {
      mockReq.body = {
        url: 'not-a-url',
      };

      await controller.analyzeUrl(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should handle service errors', async () => {
      mockReq.body = {
        url: 'https://example.com',
      };

      vi.mocked(seoService.analyzeUrl).mockRejectedValue(
        new Error('Analysis failed')
      );

      await controller.analyzeUrl(mockReq as Request, mockRes as Response);

      // Error should be caught by asyncHandler middleware
      expect(seoService.analyzeUrl).toHaveBeenCalled();
    });
  });
});

