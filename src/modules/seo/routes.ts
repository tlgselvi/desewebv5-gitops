import { Router, type Router as ExpressRouter } from 'express';
import { seoController } from './controller.js';
import { authenticate } from '@/middleware/auth.js';
import { asyncHandler } from '@/middleware/errorHandler.js';

const router: ExpressRouter = Router();

/**
 * @swagger
 * tags:
 *   name: SEO
 *   description: SEO Analysis and Project Management
 */

router.use(authenticate);

/**
 * @swagger
 * /api/v1/seo/analyze:
 *   post:
 *     summary: Analyze URLs for SEO metrics
 *     tags: [SEO]
 *     security:
 *       - bearerAuth: []
 */
router.post('/analyze', asyncHandler(async (req, res) => {
  return seoController.analyze(req, res);
}));

/**
 * @swagger
 * /api/v1/seo/metrics:
 *   get:
 *     summary: Get project metrics
 *     tags: [SEO]
 *     security:
 *       - bearerAuth: []
 */
router.get('/metrics', asyncHandler(async (req, res) => {
  return seoController.getMetrics(req, res);
}));

/**
 * @swagger
 * /api/v1/seo/trends:
 *   get:
 *     summary: Get project trends
 *     tags: [SEO]
 *     security:
 *       - bearerAuth: []
 */
router.get('/trends', asyncHandler(async (req, res) => {
  return seoController.getTrends(req, res);
}));

/**
 * @swagger
 * /api/v1/seo/analyze/url:
 *   post:
 *     summary: Analyze single URL
 *     tags: [SEO]
 *     security:
 *       - bearerAuth: []
 */
router.post('/analyze/url', asyncHandler(async (req, res) => {
  return seoController.analyzeUrl(req, res);
}));

export { router as seoRoutes };

