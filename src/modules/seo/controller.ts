import type { Request, Response } from 'express';
import { seoService } from './service.js';
import { asyncHandler } from '@/middleware/errorHandler.js';
import { seoLogger } from '@/utils/logger.js';
import { z } from 'zod';

// Validation schemas
const SeoAnalysisSchema = z.object({
  projectId: z.string().uuid(),
  urls: z.array(z.string().url()).min(1).max(10),
  options: z.object({
    device: z.enum(['mobile', 'desktop']).default('desktop'),
    throttling: z.enum(['slow3G', 'fast3G', '4G', 'none']).default('4G'),
    categories: z.array(z.string()).default(['performance', 'accessibility', 'best-practices', 'seo']),
  }).optional(),
});

const MetricsQuerySchema = z.object({
  projectId: z.string().uuid(),
  limit: z.coerce.number().min(1).max(100).default(10),
});

const TrendsQuerySchema = z.object({
  projectId: z.string().uuid(),
  days: z.coerce.number().min(1).max(365).default(30),
});

const AnalyzeUrlSchema = z.object({
  url: z.string().url(),
  options: SeoAnalysisSchema.shape.options.optional(),
});

export class SeoController {
  async analyze(req: Request, res: Response): Promise<Response> {
    const validatedData = SeoAnalysisSchema.parse(req.body);

    seoLogger.info('Starting SEO analysis', {
      projectId: validatedData.projectId,
      urlCount: validatedData.urls.length,
    });

    const result = await seoService.analyzeProject(validatedData);

    seoLogger.info('SEO analysis completed', {
      projectId: validatedData.projectId,
    });

    return res.json(result);
  }

  async getMetrics(req: Request, res: Response): Promise<Response> {
    const { projectId, limit } = MetricsQuerySchema.parse(req.query);
    const metrics = await seoService.getProjectMetrics(projectId, limit);
    return res.json({ metrics });
  }

  async getTrends(req: Request, res: Response): Promise<Response> {
    const { projectId, days } = TrendsQuerySchema.parse(req.query);
    const trends = await seoService.getProjectTrends(projectId, days);
    return res.json(trends);
  }

  async analyzeUrl(req: Request, res: Response): Promise<Response> {
    const { url, options } = AnalyzeUrlSchema.parse(req.body);
    seoLogger.info('Analyzing single URL', { url });
    const result = await seoService.analyzeUrl(url, options);
    return res.json(result);
  }
}

export const seoController = new SeoController();

