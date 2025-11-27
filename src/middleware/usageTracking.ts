import { Request, Response, NextFunction } from 'express';
import { usageService } from '@/modules/saas/usage.service.js';
import { logger } from '@/utils/logger.js';

/**
 * Middleware to track API call usage
 * Should be used after authentication middleware
 */
export function trackApiUsage(req: Request, res: Response, next: NextFunction) {
  // Track usage asynchronously (don't block request)
  const organizationId = req.user?.organizationId;
  
  if (organizationId) {
    // Don't await - track in background
    usageService.trackApiCall(
      organizationId,
      req.path,
      {
        method: req.method,
        userAgent: req.get('user-agent'),
        ip: req.ip,
      }
    ).catch((error) => {
      // Log error but don't fail the request
      logger.error('[UsageTracking] Failed to track API usage', {
        error: error instanceof Error ? error.message : String(error),
        organizationId,
        path: req.path,
      });
    });
  }

  next();
}

/**
 * Middleware to track storage usage
 * Should be used for file upload endpoints
 */
export function trackStorageUsage(bytes: number) {
  return (req: Request, res: Response, next: NextFunction) => {
    const organizationId = req.user?.organizationId;
    
    if (organizationId && bytes > 0) {
      usageService.trackStorage(
        organizationId,
        bytes,
        {
          endpoint: req.path,
          method: req.method,
        }
      ).catch((error) => {
        logger.error('[UsageTracking] Failed to track storage usage', {
          error: error instanceof Error ? error.message : String(error),
          organizationId,
        });
      });
    }

    next();
  };
}

