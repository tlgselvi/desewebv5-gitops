import type { BufferEncoding } from 'node:buffer';
import { Request, Response, NextFunction } from 'express';
import { logger } from '@/utils/logger.js';

export interface RequestWithUser extends Request {
  user?: {
    id: string;
    email: string;
    role?: string;
  };
}

/**
 * Audit logging middleware
 * Logs user actions for security and compliance
 */
export const auditMiddleware = (
  req: RequestWithUser,
  res: Response,
  next: NextFunction
): void => {
  // Log after response is sent
  const originalEnd = res.end;
  
  res.end = function (
    chunk?: unknown,
    encoding?: BufferEncoding,
    cb?: () => void
  ): Response {
    // Extract user information if available
    const userId = req.user?.id || 'anonymous';
    const userEmail = req.user?.email || 'anonymous';
    const userRole = req.user?.role || 'unknown';

    // Log audit event
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

    // Call original end method
    return originalEnd.call(this, chunk, encoding, cb);
  };

  next();
};

