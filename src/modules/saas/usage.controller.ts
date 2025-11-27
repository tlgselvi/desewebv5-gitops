import { Request, Response } from 'express';
import { usageService } from './usage.service.js';
import { featureService } from './feature.service.js';
import { asyncHandler } from '@/utils/asyncHandler.js';
import { logger } from '@/utils/logger.js';

/**
 * Usage Controller
 * Handles usage-related API endpoints
 */
export class UsageController {
  
  /**
   * Get current usage for all metrics
   * GET /api/saas/usage
   */
  getCurrentUsage = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.user?.organizationId;
    
    if (!organizationId) {
      return res.status(401).json({
        error: 'unauthorized',
        message: 'Organization ID required',
      });
    }

    const summary = await usageService.getUsageSummary(organizationId);
    const limits = await featureService.getFeatureLimits(organizationId);

    res.json({
      summary,
      limits,
    });
  });

  /**
   * Get usage history for a specific metric type
   * GET /api/saas/usage/:metricType/history
   */
  getUsageHistory = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.user?.organizationId;
    const { metricType } = req.params;
    const { period, startDate, endDate, limit } = req.query;

    if (!organizationId) {
      return res.status(401).json({
        error: 'unauthorized',
        message: 'Organization ID required',
      });
    }

    const history = await usageService.getUsageHistory(
      organizationId,
      metricType as any,
      {
        period: period as 'daily' | 'monthly' | undefined,
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
        limit: limit ? parseInt(limit as string, 10) : undefined,
      }
    );

    res.json({
      metricType,
      history,
      count: history.length,
    });
  });

  /**
   * Get current usage for a specific metric type
   * GET /api/saas/usage/:metricType
   */
  getMetricUsage = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.user?.organizationId;
    const { metricType } = req.params;
    const { period } = req.query;

    if (!organizationId) {
      return res.status(401).json({
        error: 'unauthorized',
        message: 'Organization ID required',
      });
    }

    const current = await usageService.getCurrentUsage(
      organizationId,
      metricType as any,
      (period as 'daily' | 'monthly') || 'monthly'
    );

    const access = await featureService.checkFeatureAccess(
      organizationId,
      metricType as any
    );

    res.json({
      metricType,
      current,
      limit: access.limit,
      remaining: access.remaining,
      hasAccess: access.hasAccess,
      period: period || 'monthly',
    });
  });

  /**
   * Get feature limits and usage
   * GET /api/saas/usage/limits
   */
  getFeatureLimits = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.user?.organizationId;
    
    if (!organizationId) {
      return res.status(401).json({
        error: 'unauthorized',
        message: 'Organization ID required',
      });
    }

    const limits = await featureService.getFeatureLimits(organizationId);

    if (!limits) {
      return res.status(404).json({
        error: 'not_found',
        message: 'No active subscription found',
      });
    }

    res.json(limits);
  });
}

export const usageController = new UsageController();

