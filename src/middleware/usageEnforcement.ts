import { Request, Response, NextFunction } from 'express';
import { featureService } from '@/modules/saas/feature.service.js';
import { createError } from '@/middleware/errorHandler.js';
import { logger } from '@/utils/logger.js';

/**
 * Middleware to enforce feature limits
 * Checks if organization has reached usage limit before allowing operation
 */
export function enforceUsageLimit(featureType: 'users' | 'storage' | 'api_calls' | 'devices' | 'sms' | 'emails') {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const organizationId = req.user?.organizationId;
      
      if (!organizationId) {
        return next(createError('Organization ID required', 401));
      }

      // Check feature access
      const access = await featureService.checkFeatureAccess(organizationId, featureType);
      
      if (!access.hasAccess) {
        logger.warn('[UsageEnforcement] Feature limit exceeded', {
          organizationId,
          featureType,
          limit: access.limit,
          current: access.current,
        });

        return res.status(403).json({
          error: 'usage_limit_exceeded',
          message: access.message || `Usage limit exceeded for ${featureType}`,
          limit: access.limit,
          current: access.current,
          remaining: access.remaining,
        });
      }

      // Check if requested amount would exceed limit
      const requestedAmount = req.body?.quantity || req.body?.count || 1;
      
      if (access.limit !== undefined && access.current !== undefined) {
        const newTotal = access.current + requestedAmount;
        if (newTotal > access.limit) {
          return res.status(403).json({
            error: 'usage_limit_would_exceed',
            message: `Operation would exceed usage limit: ${newTotal}/${access.limit}`,
            limit: access.limit,
            current: access.current,
            requested: requestedAmount,
            remaining: access.remaining,
          });
        }
      }

      // Attach usage info to request for later tracking
      req.usageInfo = {
        featureType,
        limit: access.limit,
        current: access.current,
        remaining: access.remaining,
      };

      next();
    } catch (error) {
      logger.error('[UsageEnforcement] Failed to enforce usage limit', {
        error: error instanceof Error ? error.message : String(error),
        featureType,
      });
      next(createError('Failed to check usage limits', 500));
    }
  };
}

/**
 * Middleware to check module access
 */
export function requireModule(moduleName: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const organizationId = req.user?.organizationId;
      
      if (!organizationId) {
        return next(createError('Organization ID required', 401));
      }

      const hasAccess = await featureService.hasModuleAccess(organizationId, moduleName);
      
      if (!hasAccess) {
        return res.status(403).json({
          error: 'module_not_available',
          message: `Module '${moduleName}' is not available in your plan`,
          module: moduleName,
        });
      }

      next();
    } catch (error) {
      logger.error('[UsageEnforcement] Failed to check module access', {
        error: error instanceof Error ? error.message : String(error),
        moduleName,
      });
      next(createError('Failed to check module access', 500));
    }
  };
}

/**
 * Middleware to check advanced feature access
 */
export function requireAdvancedFeature(featureName: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const organizationId = req.user?.organizationId;
      
      if (!organizationId) {
        return next(createError('Organization ID required', 401));
      }

      const hasAccess = await featureService.hasAdvancedFeatureAccess(
        organizationId,
        featureName
      );
      
      if (!hasAccess) {
        return res.status(403).json({
          error: 'feature_not_available',
          message: `Advanced feature '${featureName}' is not available in your plan`,
          feature: featureName,
        });
      }

      next();
    } catch (error) {
      logger.error('[UsageEnforcement] Failed to check advanced feature access', {
        error: error instanceof Error ? error.message : String(error),
        featureName,
      });
      next(createError('Failed to check feature access', 500));
    }
  };
}

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      usageInfo?: {
        featureType: string;
        limit?: number;
        current?: number;
        remaining?: number;
      };
    }
  }
}

