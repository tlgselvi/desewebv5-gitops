import { Request, Response, NextFunction } from 'express';
import { logger } from '@/utils/logger.js';
import type { RequestWithUser } from "@/middleware/auth.js";

/**
 * Audit logging middleware
 * Logs user actions for security and compliance
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

    logger.info('Audit Event', {
      action: `${req.method} ${req.path}`,
      userId,
      userEmail,
      userRole,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      statusCode: res.statusCode,
      timestamp: new Date().toISOString(),
    });
  });

  next();
};

