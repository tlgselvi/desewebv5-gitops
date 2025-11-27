/**
 * Rate Limiting API Routes
 * 
 * Provides endpoints for:
 * - Rate limit status
 * - Rate limit violations
 * - Whitelist/blacklist management
 * - Rate limit analytics
 */

import { Router, type Request, type Response } from 'express';
import type { Router as ExpressRouter } from 'express';
import { authenticate, authorize } from '@/middleware/auth.js';
import { asyncHandler } from '@/middleware/errorHandler.js';
import { rateLimitTrackingService } from '@/services/rate-limit/rate-limit-tracking.service.js';
import { db } from '@/db/index.js';
import { rateLimitTracking } from '@/db/schema/security/rate-limit-tracking.js';
import { eq, and, gte, lte, desc, sql } from 'drizzle-orm';
import { z } from 'zod';
import { logger } from '@/utils/logger.js';
import type { RequestWithUser } from '@/middleware/auth.js';

const router: ExpressRouter = Router();

/**
 * GET /api/v1/rate-limit/status
 * Get rate limit status for current user/IP
 */
router.get(
  '/status',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const reqWithUser = req as RequestWithUser;
    
    // In practice, this would query Redis for current rate limit status
    // For now, return placeholder structure
    res.json({
      key: reqWithUser.user?.id || req.ip || 'unknown',
      keyType: reqWithUser.user ? 'user' : 'ip',
      limit: 1000, // Default limit
      remaining: 950, // Placeholder
      reset: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      windowMs: 15 * 60 * 1000,
    });
  })
);

/**
 * GET /api/v1/rate-limit/violations
 * Get rate limit violations (admin only)
 */
router.get(
  '/violations',
  authenticate,
  authorize(['admin']),
  asyncHandler(async (req: Request, res: Response) => {
    const querySchema = z.object({
      page: z.coerce.number().default(1),
      limit: z.coerce.number().default(50),
      keyType: z.enum(['ip', 'user', 'org', 'endpoint']).optional(),
      endpoint: z.string().optional(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
    });

    const query = querySchema.parse(req.query);
    const offset = (query.page - 1) * query.limit;

    const conditions = [eq(rateLimitTracking.blocked, true)];

    if (query.keyType) {
      conditions.push(eq(rateLimitTracking.keyType, query.keyType));
    }

    if (query.endpoint) {
      conditions.push(eq(rateLimitTracking.endpoint, query.endpoint));
    }

    if (query.startDate) {
      conditions.push(gte(rateLimitTracking.createdAt, new Date(query.startDate)));
    }

    if (query.endDate) {
      conditions.push(lte(rateLimitTracking.createdAt, new Date(query.endDate)));
    }

    const violations = await db
      .select()
      .from(rateLimitTracking)
      .where(and(...conditions))
      .orderBy(desc(rateLimitTracking.createdAt))
      .limit(query.limit)
      .offset(offset);

    const [totalResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(rateLimitTracking)
      .where(and(...conditions));

    const total = Number(totalResult?.count || 0);

    res.json({
      violations: violations.map((v) => ({
        id: v.id,
        key: v.key,
        keyType: v.keyType,
        endpoint: v.endpoint,
        method: v.method,
        count: v.count,
        limit: v.limit,
        blocked: v.blocked,
        blockedAt: v.blockedAt,
        userId: v.userId,
        organizationId: v.organizationId,
        ip: v.ip,
        createdAt: v.createdAt,
      })),
      total,
      page: query.page,
      limit: query.limit,
      totalPages: Math.ceil(total / query.limit),
    });
  })
);

/**
 * GET /api/v1/rate-limit/stats
 * Get rate limit statistics (admin only)
 */
router.get(
  '/stats',
  authenticate,
  authorize(['admin']),
  asyncHandler(async (req: Request, res: Response) => {
    const querySchema = z.object({
      startDate: z.string().optional(),
      endDate: z.string().optional(),
    });

    const query = querySchema.parse(req.query);
    const conditions = [];

    if (query.startDate) {
      conditions.push(gte(rateLimitTracking.createdAt, new Date(query.startDate)));
    }

    if (query.endDate) {
      conditions.push(lte(rateLimitTracking.createdAt, new Date(query.endDate)));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Total violations
    const [totalViolations] = await db
      .select({ count: sql<number>`count(*)` })
      .from(rateLimitTracking)
      .where(whereClause ? and(...conditions, eq(rateLimitTracking.blocked, true)) : eq(rateLimitTracking.blocked, true));

    // Violations by key type
    const violationsByKeyType = await db
      .select({
        keyType: rateLimitTracking.keyType,
        count: sql<number>`count(*)`,
      })
      .from(rateLimitTracking)
      .where(whereClause ? and(...conditions, eq(rateLimitTracking.blocked, true)) : eq(rateLimitTracking.blocked, true))
      .groupBy(rateLimitTracking.keyType);

    // Top violators
    const topViolators = await db
      .select({
        key: rateLimitTracking.key,
        keyType: rateLimitTracking.keyType,
        count: sql<number>`count(*)`,
      })
      .from(rateLimitTracking)
      .where(whereClause ? and(...conditions, eq(rateLimitTracking.blocked, true)) : eq(rateLimitTracking.blocked, true))
      .groupBy(rateLimitTracking.key, rateLimitTracking.keyType)
      .orderBy(desc(sql<number>`count(*)`))
      .limit(10);

    res.json({
      totalViolations: Number(totalViolations?.count || 0),
      byKeyType: violationsByKeyType.reduce((acc, item) => {
        acc[item.keyType] = Number(item.count);
        return acc;
      }, {} as Record<string, number>),
      topViolators: topViolators.map((v) => ({
        key: v.key,
        keyType: v.keyType,
        count: Number(v.count),
      })),
    });
  })
);

export { router as rateLimitRoutes };

