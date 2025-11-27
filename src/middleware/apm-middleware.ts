import { Request, Response, NextFunction } from 'express';
import { apmService } from '@/services/monitoring/apm-service.js';

/**
 * APM Middleware
 * 
 * Tracks request performance using APM service
 */
export const apmMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const span = apmService.startSpan(`http_request_${req.method}`, {
    path: req.path,
    method: req.method,
  });

  // Track response finish
  res.on('finish', () => {
    // Add response attributes
    span.attributes['statusCode'] = res.statusCode;
    // End the span
    apmService.endSpan(span);
  });

  next();
};
