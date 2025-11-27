import { Router } from 'express';
import type { Router as ExpressRouter } from 'express';
import { usageController } from './usage.controller.js';
import { authenticate } from '@/middleware/auth.js';
import { trackApiUsage } from '@/middleware/usageTracking.js';

const router: ExpressRouter = Router();

/**
 * Usage Routes
 * All routes require authentication
 */
router.use(authenticate);
router.use(trackApiUsage); // Track API usage for these endpoints

/**
 * GET /api/saas/usage
 * Get current usage summary for all metrics
 */
router.get('/', usageController.getCurrentUsage);

/**
 * GET /api/saas/usage/limits
 * Get feature limits and current usage
 */
router.get('/limits', usageController.getFeatureLimits);

/**
 * GET /api/saas/usage/:metricType
 * Get current usage for a specific metric type
 * Query params: period (daily|monthly)
 */
router.get('/:metricType', usageController.getMetricUsage);

/**
 * GET /api/saas/usage/:metricType/history
 * Get usage history for a specific metric type
 * Query params: period, startDate, endDate, limit
 */
router.get('/:metricType/history', usageController.getUsageHistory);

export { router as usageRoutes };

