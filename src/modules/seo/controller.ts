import type { Request, Response } from 'express';
import { seoService } from './service.js';
import { asyncHandler } from '@/middleware/errorHandler.js';
import { seoLogger } from '@/utils/logger.js';
import { z } from 'zod';
import type { RequestWithUser } from '@/middleware/auth.js';
import { CustomError } from '@/middleware/errorHandler.js';

// Validation schemas with Turkish error messages
const SeoAnalysisSchema = z.object({
  projectId: z.string().uuid({ message: 'Proje ID geçerli bir UUID formatında olmalıdır' }),
  urls: z.array(z.string().url({ message: 'Geçerli bir URL formatı giriniz' }))
    .min(1, { message: 'En az bir URL belirtilmelidir' })
    .max(10, { message: 'En fazla 10 URL analiz edilebilir' }),
  options: z.object({
    device: z.enum(['mobile', 'desktop'], { 
      errorMap: () => ({ message: 'Cihaz tipi "mobile" veya "desktop" olmalıdır' }) 
    }).default('desktop'),
    throttling: z.enum(['slow3G', 'fast3G', '4G', 'none'], {
      errorMap: () => ({ message: 'Throttling "slow3G", "fast3G", "4G" veya "none" olmalıdır' })
    }).default('4G'),
    categories: z.array(z.string()).default(['performance', 'accessibility', 'best-practices', 'seo']),
  }).optional(),
});

const MetricsQuerySchema = z.object({
  projectId: z.string().uuid({ message: 'Proje ID geçerli bir UUID formatında olmalıdır' }),
  limit: z.coerce.number()
    .min(1, { message: 'Limit en az 1 olmalıdır' })
    .max(100, { message: 'Limit en fazla 100 olabilir' })
    .default(10),
});

const TrendsQuerySchema = z.object({
  projectId: z.string().uuid({ message: 'Proje ID geçerli bir UUID formatında olmalıdır' }),
  days: z.coerce.number()
    .min(1, { message: 'Gün sayısı en az 1 olmalıdır' })
    .max(365, { message: 'Gün sayısı en fazla 365 olabilir' })
    .default(30),
});

const AnalyzeUrlSchema = z.object({
  url: z.string().url({ message: 'Geçerli bir URL formatı giriniz' }),
  options: SeoAnalysisSchema.shape.options.optional(),
});

export class SeoController {
  /**
   * Get organizationId from request user
   * Throws error if not available
   */
  private getOrganizationId(req: Request): string {
    const reqWithUser = req as RequestWithUser;
    const organizationId = reqWithUser.user?.organizationId;
    
    if (!organizationId) {
      throw new CustomError('Organizasyon bağlamı gerekli', 400);
    }
    
    return organizationId;
  }

  /**
   * Analyze project URLs
   */
  async analyze(req: Request, res: Response): Promise<Response> {
    const validatedData = SeoAnalysisSchema.parse(req.body);
    const organizationId = this.getOrganizationId(req);

    seoLogger.info('Starting SEO analysis', {
      projectId: validatedData.projectId,
      organizationId,
      urlCount: validatedData.urls.length,
    });

    const result = await seoService.analyzeProject(validatedData, organizationId);

    seoLogger.info('SEO analysis completed', {
      projectId: validatedData.projectId,
      organizationId,
    });

    return res.json(result);
  }

  /**
   * Get project metrics
   */
  async getMetrics(req: Request, res: Response): Promise<Response> {
    const { projectId, limit } = MetricsQuerySchema.parse(req.query);
    const organizationId = this.getOrganizationId(req);
    
    const metrics = await seoService.getProjectMetrics(projectId, organizationId, limit);
    return res.json({ metrics });
  }

  /**
   * Get project trends
   */
  async getTrends(req: Request, res: Response): Promise<Response> {
    const { projectId, days } = TrendsQuerySchema.parse(req.query);
    const organizationId = this.getOrganizationId(req);
    
    const trends = await seoService.getProjectTrends(projectId, organizationId, days);
    return res.json(trends);
  }

  /**
   * Analyze single URL
   */
  async analyzeUrl(req: Request, res: Response): Promise<Response> {
    const { url, options } = AnalyzeUrlSchema.parse(req.body);
    
    seoLogger.info('Analyzing single URL', { url });
    const result = await seoService.analyzeUrl(url, options);
    return res.json(result);
  }
}

export const seoController = new SeoController();

