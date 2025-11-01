import { Request, Response, NextFunction } from 'express';
import { logger } from '@/utils/logger.js';

/**
 * Input sanitization middleware
 * Removes potentially dangerous characters from request body
 */
export const sanitizeInput = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const sanitize = (obj: any): any => {
    if (typeof obj === 'string') {
      // Remove script tags and dangerous patterns
      return obj
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/javascript:/gi, '')
        .replace(/on\w+\s*=/gi, '') // Remove event handlers like onClick=
        .trim();
    }

    if (Array.isArray(obj)) {
      return obj.map(sanitize);
    }

    if (obj && typeof obj === 'object') {
      const sanitized: Record<string, unknown> = {};
      for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
          sanitized[key] = sanitize(obj[key]);
        }
      }
      return sanitized;
    }

    return obj;
  };

  if (req.body && typeof req.body === 'object') {
    req.body = sanitize(req.body);
  }

  if (req.query && typeof req.query === 'object') {
    req.query = sanitize(req.query) as typeof req.query;
  }

  next();
};

/**
 * Content Security Policy headers helper
 */
export const cspHeaders = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self';"
  );
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');

  next();
};

/**
 * Request size limiter
 */
export const requestSizeLimiter = (
  maxSize: number = 10 * 1024 * 1024 // 10MB default
) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const contentLength = parseInt(req.get('Content-Length') || '0', 10);

    if (contentLength > maxSize) {
      logger.warn('Request too large', {
        size: contentLength,
        maxSize,
        ip: req.ip,
        url: req.url,
      });

      res.status(413).json({
        error: 'Payload Too Large',
        message: `Request body exceeds maximum size of ${maxSize / 1024 / 1024}MB`,
      });
      return;
    }

    next();
  };
};

/**
 * Rate limiting per user (if authenticated)
 * Should be used after authentication middleware
 */
export const userRateLimit = (
  windowMs: number = 15 * 60 * 1000, // 15 minutes
  maxRequests: number = 100
) => {
  const userRequestCounts = new Map<string, { count: number; resetAt: number }>();

  setInterval(() => {
    const now = Date.now();
    for (const [userId, data] of userRequestCounts.entries()) {
      if (data.resetAt < now) {
        userRequestCounts.delete(userId);
      }
    }
  }, windowMs);

  return (req: Request, res: Response, next: NextFunction): void => {
    const userId = (req as any).user?.id || req.ip;

    const userData = userRequestCounts.get(userId);
    const now = Date.now();

    if (!userData || userData.resetAt < now) {
      userRequestCounts.set(userId, {
        count: 1,
        resetAt: now + windowMs,
      });
      next();
      return;
    }

    if (userData.count >= maxRequests) {
      logger.warn('User rate limit exceeded', {
        userId,
        count: userData.count,
        ip: req.ip,
        url: req.url,
      });

      res.status(429).json({
        error: 'Too Many Requests',
        message: `Rate limit exceeded. Maximum ${maxRequests} requests per ${windowMs / 1000 / 60} minutes.`,
        retryAfter: Math.ceil((userData.resetAt - now) / 1000),
      });
      return;
    }

    userData.count++;
    next();
  };
};

/**
 * IP whitelist middleware
 */
export const ipWhitelist = (allowedIPs: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const clientIP = req.ip || req.socket.remoteAddress || '';

    if (!allowedIPs.includes(clientIP) && allowedIPs.length > 0) {
      logger.warn('Access denied - IP not whitelisted', {
        ip: clientIP,
        url: req.url,
      });

      res.status(403).json({
        error: 'Forbidden',
        message: 'Access denied',
      });
      return;
    }

    next();
  };
};

/**
 * IP blacklist middleware
 */
export const ipBlacklist = (blockedIPs: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const clientIP = req.ip || req.socket.remoteAddress || '';

    if (blockedIPs.includes(clientIP)) {
      logger.warn('Access denied - IP blacklisted', {
        ip: clientIP,
        url: req.url,
      });

      res.status(403).json({
        error: 'Forbidden',
        message: 'Access denied',
      });
      return;
    }

    next();
  };
};

