/**
 * Business Metrics API Routes
 * 
 * Provides endpoints for business metrics:
 * - Revenue metrics (MRR, ARR, growth)
 * - User metrics (DAU, MAU, growth, retention, churn)
 * - Feature adoption metrics
 */

import { Router, type Request, type Response } from 'express';
import type { Router as ExpressRouter } from 'express';
import { authenticate, authorize } from '@/middleware/auth.js';
import { asyncHandler } from '@/middleware/errorHandler.js';
import { businessMetricsService } from '@/services/analytics/business-metrics.service.js';
import { z } from 'zod';
import type { RequestWithUser } from '@/middleware/auth.js';

const router: ExpressRouter = Router();

/**
 * GET /api/v1/analytics/business-metrics
 * Get comprehensive business metrics
 */
router.get(
  '/business-metrics',
  authenticate,
  authorize(['admin', 'analytics.read']),
  asyncHandler(async (req: Request, res: Response) => {
    const querySchema = z.object({
      organizationId: z.string().uuid().optional(),
    });

    const query = querySchema.parse(req.query);
    const reqWithUser = req as RequestWithUser;
    
    // If user is not admin, limit to their organization
    const organizationId = reqWithUser.user?.role === 'admin' 
      ? query.organizationId 
      : reqWithUser.user?.organizationId;

    const metrics = await businessMetricsService.getBusinessMetrics(organizationId);

    res.json({
      ...metrics,
      timestamp: new Date().toISOString(),
    });
  })
);

/**
 * GET /api/v1/analytics/revenue
 * Get revenue metrics
 */
router.get(
  '/revenue',
  authenticate,
  authorize(['admin', 'analytics.read']),
  asyncHandler(async (req: Request, res: Response) => {
    const querySchema = z.object({
      organizationId: z.string().uuid().optional(),
    });

    const query = querySchema.parse(req.query);
    const reqWithUser = req as RequestWithUser;
    const organizationId = reqWithUser.user?.role === 'admin' 
      ? query.organizationId 
      : reqWithUser.user?.organizationId;

    const [mrr, arr, growthRate] = await Promise.all([
      businessMetricsService.calculateMRR(organizationId),
      businessMetricsService.calculateARR(organizationId),
      businessMetricsService.calculateRevenueGrowthRate(),
    ]);

    res.json({
      mrr,
      arr,
      growthRate,
      byPlan: {}, // Would be populated from subscription plans
      trends: {
        daily: [],
        weekly: [],
        monthly: [],
      },
    });
  })
);

/**
 * GET /api/v1/analytics/users
 * Get user metrics
 */
router.get(
  '/users',
  authenticate,
  authorize(['admin', 'analytics.read']),
  asyncHandler(async (req: Request, res: Response) => {
    const reqWithUser = req as RequestWithUser;
    const organizationId = reqWithUser.user?.role === 'admin' 
      ? undefined 
      : reqWithUser.user?.organizationId;

    const [
      total,
      dau,
      mau,
      wau,
      growthRate,
      newUsers,
      retentionRate,
      churnRate,
    ] = await Promise.all([
      businessMetricsService.getTotalUsers(organizationId),
      businessMetricsService.calculateDAU(),
      businessMetricsService.calculateMAU(),
      businessMetricsService.calculateWAU(),
      businessMetricsService.calculateUserGrowthRate('monthly'),
      businessMetricsService.getNewUsersThisMonth(organizationId),
      businessMetricsService.calculateRetentionRate(),
      businessMetricsService.calculateChurnRate(),
    ]);

    res.json({
      total,
      active: {
        dau,
        mau,
        wau,
      },
      growth: {
        rate: growthRate,
        new: newUsers,
        trends: {
          daily: [],
          weekly: [],
          monthly: [],
        },
      },
      retention: {
        rate: retentionRate,
        churn: churnRate,
        cohort: {},
      },
    });
  })
);

/**
 * GET /api/v1/analytics/features
 * Get feature adoption metrics
 */
router.get(
  '/features',
  authenticate,
  authorize(['admin', 'analytics.read']),
  asyncHandler(async (req: Request, res: Response) => {
    // In practice, this would query feature usage tracking
    res.json({
      adoption: {},
      usage: {},
    });
  })
);

export { router as businessMetricsRoutes };

