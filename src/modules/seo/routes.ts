import { Router, type Router as ExpressRouter } from 'express';
import { seoController } from './controller.js';
import { authenticate } from '@/middleware/auth.js';
import { setRLSContextMiddleware } from '@/middleware/rls.js';
import { asyncHandler } from '@/middleware/errorHandler.js';
import { z } from 'zod';

const router: ExpressRouter = Router();

/**
 * @swagger
 * tags:
 *   name: SEO
 *   description: SEO Analysis and Project Management
 * 
 * components:
 *   schemas:
 *     SeoProject:
 *       type: object
 *       required:
 *         - id
 *         - organizationId
 *         - name
 *         - domain
 *         - ownerId
 *         - status
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         organizationId:
 *           type: string
 *           format: uuid
 *         name:
 *           type: string
 *         domain:
 *           type: string
 *         description:
 *           type: string
 *         targetRegion:
 *           type: string
 *         primaryKeywords:
 *           type: array
 *           items:
 *             type: string
 *         targetDomainAuthority:
 *           type: integer
 *         targetCtrIncrease:
 *           type: integer
 *         status:
 *           type: string
 *           enum: [active, inactive, archived]
 *         ownerId:
 *           type: string
 *           format: uuid
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *     SeoMetrics:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         projectId:
 *           type: string
 *           format: uuid
 *         url:
 *           type: string
 *         performance:
 *           type: number
 *         accessibility:
 *           type: number
 *         bestPractices:
 *           type: number
 *         seo:
 *           type: number
 *         measuredAt:
 *           type: string
 *           format: date-time
 *     ErrorResponse:
 *       type: object
 *       properties:
 *         error:
 *           type: string
 *         message:
 *           type: string
 *         timestamp:
 *           type: string
 *           format: date-time
 *         path:
 *           type: string
 *         method:
 *           type: string
 *         details:
 *           type: object
 */

router.use(authenticate);
router.use(setRLSContextMiddleware); // Set RLS context for tenant isolation

/**
 * @swagger
 * /api/v1/seo/analyze:
 *   post:
 *     summary: Analyze URLs for SEO metrics
 *     description: Analyzes multiple URLs for a project and returns SEO metrics including performance, accessibility, best practices, and SEO scores
 *     tags: [SEO]
 *     security:
 *       - bearerAuth: []
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
 *                 description: SEO project ID
 *               urls:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: uri
 *                 minItems: 1
 *                 maxItems: 10
 *                 description: URLs to analyze
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
 *         description: Analysis completed successfully
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
 *                 analyzedAt:
 *                   type: string
 *                   format: date-time
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Project not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/analyze', asyncHandler(async (req, res) => {
  return seoController.analyze(req, res);
}));

/**
 * @swagger
 * /api/v1/seo/metrics:
 *   get:
 *     summary: Get project metrics
 *     description: Retrieves SEO metrics for a project with optional limit
 *     tags: [SEO]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: projectId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: SEO project ID
 *       - in: query
 *         name: limit
 *         required: false
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *         description: Maximum number of metrics to return
 *     responses:
 *       200:
 *         description: Metrics retrieved successfully
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
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Project not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/metrics', asyncHandler(async (req, res) => {
  return seoController.getMetrics(req, res);
}));

/**
 * @swagger
 * /api/v1/seo/trends:
 *   get:
 *     summary: Get project trends
 *     description: Retrieves SEO trends for a project over a specified period
 *     tags: [SEO]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: projectId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: SEO project ID
 *       - in: query
 *         name: days
 *         required: false
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 365
 *           default: 30
 *         description: Number of days to analyze trends
 *     responses:
 *       200:
 *         description: Trends retrieved successfully
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
 *                     accessibility:
 *                       type: object
 *                     seo:
 *                       type: object
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Project not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/trends', asyncHandler(async (req, res) => {
  return seoController.getTrends(req, res);
}));

/**
 * @swagger
 * /api/v1/seo/analyze/url:
 *   post:
 *     summary: Analyze single URL
 *     description: Analyzes a single URL and returns detailed SEO metrics
 *     tags: [SEO]
 *     security:
 *       - bearerAuth: []
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
 *                 description: URL to analyze
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
 *         description: URL analyzed successfully
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
 *                 opportunities:
 *                   type: array
 *                 diagnostics:
 *                   type: array
 *                 analyzedAt:
 *                   type: string
 *                   format: date-time
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/analyze/url', asyncHandler(async (req, res) => {
  return seoController.analyzeUrl(req, res);
}));

export { router as seoRoutes };

