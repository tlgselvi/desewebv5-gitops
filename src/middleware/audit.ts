import { Request, Response, NextFunction } from 'express';
import { logger } from '@/utils/logger.js';
import type { RequestWithUser } from "@/middleware/auth.js";

/**
 * Audit logging middleware
 * Logs user actions for security and compliance
 * Includes RLS context information for multi-tenancy tracking
 */
export const auditMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const reqWithUser = req as RequestWithUser;
  res.once('finish', () => {
    const userId = reqWithUser.user?.id || 'anonymous';
    const userEmail = reqWithUser.user?.email || 'anonymous';
    const userRole = reqWithUser.user?.role || 'unknown';
    const organizationId = reqWithUser.user?.organizationId || undefined;

    // Get RLS context information (set by RLS middleware)
    const rlsContextSet = (req as any).rlsContextSet ?? false;
    const rlsContext = (req as any).rlsContext || null;

    const auditData: Record<string, unknown> = {
      action: `${req.method} ${req.path}`,
      userId,
      userEmail,
      userRole,
      organizationId,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      statusCode: res.statusCode,
      timestamp: new Date().toISOString(),
      // RLS context information
      rlsContextSet,
    };

    // Add RLS context details if available
    if (rlsContext) {
      auditData.rlsContext = {
        organizationId: rlsContext.organizationId,
        userId: rlsContext.userId,
        role: rlsContext.role,
      };
    }

    // Log warning if RLS context is not set for authenticated requests
    if (!rlsContextSet && userId !== 'anonymous') {
      logger.warn('Audit Event - RLS context not set for authenticated request', auditData);
    } else {
      logger.info('Audit Event', auditData);
    }
  });

  next();
};

