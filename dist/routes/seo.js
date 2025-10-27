import { Router } from 'express';
import { z } from 'zod';
import { seoAnalyzer } from '@/services/seoAnalyzer.js';
import { asyncHandler } from '@/middleware/errorHandler.js';
import { seoLogger } from '@/utils/logger.js';
const router = Router();
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
/**
 * @swagger
 * /seo/analyze:
 *   post:
 *     summary: Analyze URLs for SEO metrics
 *     tags: [SEO]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - projectId
 *               - urls
 *             properties:
 *               projectId:
 *                 type: string
 *                 format: uuid
 *               urls:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: uri
 *                 minItems: 1
 *                 maxItems: 10
 *               options:
 *                 type: object
 *                 properties:
 *                   device:
 *                     type: string
 *                     enum: [mobile, desktop]
 *                     default: desktop
 *                   throttling:
 *                     type: string
 *                     enum: [slow3G, fast3G, 4G, none]
 *                     default: 4G
 *                   categories:
 *                     type: array
 *                     items:
 *                       type: string
 *                     default: [performance, accessibility, best-practices, seo]
 *     responses:
 *       200:
 *         description: SEO analysis completed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 projectId:
 *                   type: string
 *                   format: uuid
 *                 totalUrls:
 *                   type: integer
 *                 successfulAnalyses:
 *                   type: integer
 *                 failedAnalyses:
 *                   type: integer
 *                 results:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/SeoMetrics'
 *                 errors:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       url:
 *                         type: string
 *                       error:
 *                         type: string
 *                 analyzedAt:
 *                   type: string
 *                   format: date-time
 *       400:
 *         description: Validation error
 *       404:
 *         description: Project not found
 */
router.post('/analyze', asyncHandler(async (req, res) => {
    const validatedData = SeoAnalysisSchema.parse(req.body);
    seoLogger.info('Starting SEO analysis', {
        projectId: validatedData.projectId,
        urlCount: validatedData.urls.length,
    });
    const result = await seoAnalyzer.analyzeProject(validatedData);
    seoLogger.info('SEO analysis completed', {
        projectId: validatedData.projectId,
        successful: result.successfulAnalyses,
        failed: result.failedAnalyses,
    });
    res.json(result);
}));
/**
 * @swagger
 * /seo/metrics:
 *   get:
 *     summary: Get project metrics
 *     tags: [SEO]
 *     parameters:
 *       - in: query
 *         name: projectId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *     responses:
 *       200:
 *         description: Project metrics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 metrics:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/SeoMetrics'
 *       400:
 *         description: Validation error
 */
router.get('/metrics', asyncHandler(async (req, res) => {
    const { projectId, limit } = MetricsQuerySchema.parse(req.query);
    const metrics = await seoAnalyzer.getProjectMetrics(projectId, limit);
    res.json({ metrics });
}));
/**
 * @swagger
 * /seo/trends:
 *   get:
 *     summary: Get project trends
 *     tags: [SEO]
 *     parameters:
 *       - in: query
 *         name: projectId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: days
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 365
 *           default: 30
 *     responses:
 *       200:
 *         description: Project trends
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 projectId:
 *                   type: string
 *                   format: uuid
 *                 period:
 *                   type: string
 *                 metrics:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/SeoMetrics'
 *                 trends:
 *                   type: object
 *                   properties:
 *                     performance:
 *                       type: object
 *                       properties:
 *                         current:
 *                           type: number
 *                         previous:
 *                           type: number
 *                         change:
 *                           type: number
 *                         changePercent:
 *                           type: number
 *                     accessibility:
 *                       type: object
 *                       properties:
 *                         current:
 *                           type: number
 *                         previous:
 *                           type: number
 *                         change:
 *                           type: number
 *                         changePercent:
 *                           type: number
 *                     seo:
 *                       type: object
 *                       properties:
 *                         current:
 *                           type: number
 *                         previous:
 *                           type: number
 *                         change:
 *                           type: number
 *                         changePercent:
 *                           type: number
 *       400:
 *         description: Validation error
 */
router.get('/trends', asyncHandler(async (req, res) => {
    const { projectId, days } = TrendsQuerySchema.parse(req.query);
    const trends = await seoAnalyzer.getProjectTrends(projectId, days);
    res.json(trends);
}));
/**
 * @swagger
 * /seo/analyze/url:
 *   post:
 *     summary: Analyze single URL
 *     tags: [SEO]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - url
 *             properties:
 *               url:
 *                 type: string
 *                 format: uri
 *               options:
 *                 type: object
 *                 properties:
 *                   device:
 *                     type: string
 *                     enum: [mobile, desktop]
 *                     default: desktop
 *                   throttling:
 *                     type: string
 *                     enum: [slow3G, fast3G, 4G, none]
 *                     default: 4G
 *                   categories:
 *                     type: array
 *                     items:
 *                       type: string
 *                     default: [performance, accessibility, best-practices, seo]
 *     responses:
 *       200:
 *         description: URL analysis completed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 url:
 *                   type: string
 *                 scores:
 *                   type: object
 *                   properties:
 *                     performance:
 *                       type: number
 *                     accessibility:
 *                       type: number
 *                     bestPractices:
 *                       type: number
 *                     seo:
 *                       type: number
 *                 coreWebVitals:
 *                   type: object
 *                   properties:
 *                     firstContentfulPaint:
 *                       type: number
 *                     largestContentfulPaint:
 *                       type: number
 *                     cumulativeLayoutShift:
 *                       type: number
 *                     firstInputDelay:
 *                       type: number
 *                     totalBlockingTime:
 *                       type: number
 *                     speedIndex:
 *                       type: number
 *                     timeToInteractive:
 *                       type: number
 *                 opportunities:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       title:
 *                         type: string
 *                       description:
 *                         type: string
 *                       score:
 *                         type: number
 *                       numericValue:
 *                         type: number
 *                       displayValue:
 *                         type: string
 *                 diagnostics:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       title:
 *                         type: string
 *                       description:
 *                         type: string
 *                       score:
 *                         type: number
 *                       details:
 *                         type: object
 *                 analyzedAt:
 *                   type: string
 *                   format: date-time
 *       400:
 *         description: Validation error
 */
router.post('/analyze/url', asyncHandler(async (req, res) => {
    const { url, options } = req.body;
    if (!url) {
        return res.status(400).json({
            error: 'Validation Error',
            message: 'URL is required',
        });
    }
    seoLogger.info('Analyzing single URL', { url });
    const result = await seoAnalyzer.analyzeUrl(url, options);
    res.json(result);
}));
export { router as seoRoutes };
//# sourceMappingURL=seo.js.map