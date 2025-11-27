/**
 * Rate Limit Tracking Service
 * 
 * Tracks rate limit violations and usage for monitoring and analytics
 */

import { db } from '@/db/index.js';
import { rateLimitTracking } from '@/db/schema/security/rate-limit-tracking.js';
import { logger } from '@/utils/logger.js';
import { Request } from 'express';
import type { RequestWithUser } from '@/middleware/auth.js';

export interface RateLimitViolationData {
  key: string;
  keyType: 'ip' | 'user' | 'org' | 'endpoint';
  endpoint: string;
  method: string;
  count: number;
  limit: number;
  windowMs: number;
  windowStart: Date;
  windowEnd: Date;
  userId?: string;
  organizationId?: string;
  ip?: string;
  userAgent?: string;
}

export class RateLimitTrackingService {
  /**
   * Track rate limit violation
   */
  async trackViolation(data: RateLimitViolationData): Promise<void> {
    try {
      await db.insert(rateLimitTracking).values({
        key: data.key,
        keyType: data.keyType,
        endpoint: data.endpoint,
        method: data.method,
        count: data.count,
        limit: data.limit,
        windowMs: data.windowMs,
        windowStart: data.windowStart,
        windowEnd: data.windowEnd,
        blocked: true,
        blockedAt: new Date(),
        userId: data.userId,
        organizationId: data.organizationId,
        ip: data.ip,
        userAgent: data.userAgent,
      });

      logger.warn('Rate limit violation tracked', {
        key: data.key,
        keyType: data.keyType,
        endpoint: data.endpoint,
        count: data.count,
        limit: data.limit,
      });
    } catch (error) {
      logger.error('Failed to track rate limit violation', {
        error,
        data,
      });
    }
  }

  /**
   * Track rate limit usage (for analytics)
   */
  async trackUsage(data: RateLimitViolationData): Promise<void> {
    try {
      await db.insert(rateLimitTracking).values({
        key: data.key,
        keyType: data.keyType,
        endpoint: data.endpoint,
        method: data.method,
        count: data.count,
        limit: data.limit,
        windowMs: data.windowMs,
        windowStart: data.windowStart,
        windowEnd: data.windowEnd,
        blocked: false,
        userId: data.userId,
        organizationId: data.organizationId,
        ip: data.ip,
        userAgent: data.userAgent,
      });
    } catch (error) {
      logger.error('Failed to track rate limit usage', {
        error,
        data,
      });
    }
  }

  /**
   * Extract tracking data from request
   */
  extractTrackingData(
    req: Request,
    key: string,
    keyType: 'ip' | 'user' | 'org' | 'endpoint',
    count: number,
    limit: number,
    windowMs: number,
    windowStart: Date,
    windowEnd: Date
  ): RateLimitViolationData {
    const reqWithUser = req as RequestWithUser;
    
    return {
      key,
      keyType,
      endpoint: req.path,
      method: req.method,
      count,
      limit,
      windowMs,
      windowStart,
      windowEnd,
      userId: reqWithUser.user?.id,
      organizationId: reqWithUser.user?.organizationId,
      ip: req.ip || req.socket.remoteAddress || undefined,
      userAgent: req.get('user-agent') || undefined,
    };
  }

  /**
   * Get violation statistics
   */
  async getViolationStats(options: {
    startDate?: Date;
    endDate?: Date;
    keyType?: 'ip' | 'user' | 'org' | 'endpoint';
    endpoint?: string;
  } = {}) {
    // In practice, this would query the database
    // For now, return placeholder structure
    return {
      totalViolations: 0,
      byKeyType: {} as Record<string, number>,
      byEndpoint: {} as Record<string, number>,
      topViolators: [] as Array<{ key: string; count: number }>,
    };
  }
}

export const rateLimitTrackingService = new RateLimitTrackingService();

