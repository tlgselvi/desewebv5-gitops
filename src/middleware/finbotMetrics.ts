import { Request, Response, NextFunction } from 'express';
import { finbotMetrics } from '@/config/prometheus.js';
import { logger } from '@/utils/logger.js';

/**
 * Middleware to record FinBot-specific Prometheus metrics
 * Records request count and duration for all FinBot API endpoints
 */
export function finbotMetricsMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const start = Date.now();
  const method = req.method;
  const path = req.route?.path || req.path;

  // Override res.end to capture metrics when response is sent
  const originalEnd = res.end;
  res.end = function (chunk?: any, encoding?: any): Response {
    const duration = (Date.now() - start) / 1000; // Convert to seconds
    const statusCode = res.statusCode.toString();

    // Record metrics
    finbotMetrics.requestDuration.observe(
      { method, path, status_code: statusCode },
      duration
    );

    finbotMetrics.requestTotal.inc({
      method,
      path,
      status_code: statusCode,
    });

    // Log request details (structured logging)
    logger.info('FinBot API request completed', {
      method,
      path,
      status: statusCode,
      duration_ms: Math.round(duration * 1000),
      userId: (req as any).user?.id,
    });

    // Call original end method
    return originalEnd.call(this, chunk, encoding);
  };

  next();
}

