import { Router } from 'express';
import { z } from 'zod';
import { db, auditLogs } from '@/db/index.js';
import { eq, desc, gte, and, sql } from 'drizzle-orm';
import { asyncHandler } from '@/middleware/errorHandler.js';
import { authenticate, authorize, AuthenticatedRequest } from '@/middleware/auth.js';
import { logger } from '@/utils/logger.js';

const router = Router();

// All audit routes require authentication and admin role
router.use(authenticate);
router.use(authorize(['admin']));

// Validation schemas
const AuditQuerySchema = z.object({
  userId: z.string().uuid().optional(),
  action: z.string().optional(),
  resourceType: z.string().optional(),
  resourceId: z.string().uuid().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  success: z.coerce.boolean().optional(),
  limit: z.coerce.number().min(1).max(1000).default(100),
  offset: z.coerce.number().min(0).default(0),
});

/**
 * @swagger
 * /audit:
 *   get:
 *     summary: Get audit logs
 *     tags: [Audit]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: action
 *         schema:
 *           type: string
 *       - in: query
 *         name: resourceType
 *         schema:
 *           type: string
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: success
 *         schema:
 *           type: boolean
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 100
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *     responses:
 *       200:
 *         description: Audit logs
 */
router.get('/', asyncHandler(async (req, res) => {
  const validatedData = AuditQuerySchema.parse(req.query);
  const authenticatedReq = req as AuthenticatedRequest;

  const conditions = [];

  if (validatedData.userId) {
    conditions.push(eq(auditLogs.userId, validatedData.userId));
  }

  if (validatedData.action) {
    conditions.push(eq(auditLogs.action, validatedData.action));
  }

  if (validatedData.resourceType) {
    conditions.push(eq(auditLogs.resourceType, validatedData.resourceType));
  }

  if (validatedData.resourceId) {
    conditions.push(eq(auditLogs.resourceId, validatedData.resourceId));
  }

  if (validatedData.success !== undefined) {
    conditions.push(eq(auditLogs.success, validatedData.success));
  }

  if (validatedData.startDate) {
    conditions.push(gte(auditLogs.createdAt, new Date(validatedData.startDate)));
  }

  if (validatedData.endDate) {
    conditions.push(sql`${auditLogs.createdAt} <= ${new Date(validatedData.endDate)}`);
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  // Get logs with pagination
  const logs = await db
    .select()
    .from(auditLogs)
    .where(whereClause)
    .orderBy(desc(auditLogs.createdAt))
    .limit(validatedData.limit)
    .offset(validatedData.offset);

  // Get total count for pagination
  const totalCountResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(auditLogs)
    .where(whereClause);
  
  const totalCount = Number(totalCountResult[0]?.count || 0);

  logger.info('Audit logs retrieved', {
    userId: authenticatedReq.user?.id,
    filters: validatedData,
    count: logs.length,
  });

  res.json({
    logs,
    pagination: {
      total: totalCount,
      limit: validatedData.limit,
      offset: validatedData.offset,
      hasMore: totalCount > validatedData.offset + validatedData.limit,
    },
  });
}));

/**
 * @swagger
 * /audit/stats:
 *   get:
 *     summary: Get audit log statistics
 *     tags: [Audit]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Audit statistics
 */
router.get('/stats', asyncHandler(async (req, res) => {
  const authenticatedReq = req as AuthenticatedRequest;

  // Get stats by action
  const statsByAction = await db
    .select({
      action: auditLogs.action,
      count: sql<number>`count(*)`,
    })
    .from(auditLogs)
    .groupBy(auditLogs.action)
    .orderBy(desc(sql<number>`count(*)`))
    .limit(10);

  // Get stats by success/failure
  const statsBySuccess = await db
    .select({
      success: auditLogs.success,
      count: sql<number>`count(*)`,
    })
    .from(auditLogs)
    .groupBy(auditLogs.success);

  // Get recent failed actions
  const recentFailures = await db
    .select()
    .from(auditLogs)
    .where(eq(auditLogs.success, false))
    .orderBy(desc(auditLogs.createdAt))
    .limit(10);

  logger.info('Audit statistics retrieved', {
    userId: authenticatedReq.user?.id,
  });

  res.json({
    byAction: statsByAction,
    bySuccess: statsBySuccess,
    recentFailures,
  });
}));

export { router as auditRoutes };

