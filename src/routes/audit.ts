import { Router } from 'express';
import { and, between, eq, gte, lte } from 'drizzle-orm';
import { db } from '@/db/index.js';
import { auditLogs } from '@/db/schema/audit.js';
import { withAuth } from '@/rbac/decorators.js';
import { asyncHandler } from '@/middleware/errorHandler.js';
import { logger } from '@/utils/logger.js';

const router = Router();

/**
 * @swagger
 * /api/v1/audit:
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
 *         description: Filter by user ID
 *       - in: query
 *         name: resource
 *         schema:
 *           type: string
 *         description: Filter by resource
 *       - in: query
 *         name: action
 *         schema:
 *           type: string
 *         description: Filter by action
 *       - in: query
 *         name: status
 *         schema:
 *           type: integer
 *         description: Filter by HTTP status code
 *       - in: query
 *         name: from
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Start date (ISO 8601)
 *       - in: query
 *         name: to
 *         schema:
 *           type: string
 *           format: date-time
 *         description: End date (ISO 8601)
 *     responses:
 *       200:
 *         description: Audit logs
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 */
router.get(
  '/',
  ...withAuth('*', 'read'), // Only admin can read audit logs
  asyncHandler(async (req, res) => {
    const { userId, resource, action, from, to, status } = req.query as Record<
      string,
      string | undefined
    >;

    const whereConditions: ReturnType<typeof eq>[] = [];

    if (userId) {
      whereConditions.push(eq(auditLogs.userId, userId));
    }
    if (resource) {
      whereConditions.push(eq(auditLogs.resource, resource));
    }
    if (action) {
      whereConditions.push(eq(auditLogs.action, action));
    }
    if (status) {
      whereConditions.push(eq(auditLogs.status, Number.parseInt(status, 10)));
    }
    if (from && to) {
      whereConditions.push(between(auditLogs.ts, new Date(from), new Date(to)));
    } else if (from) {
      whereConditions.push(gte(auditLogs.ts, new Date(from)));
    } else if (to) {
      whereConditions.push(lte(auditLogs.ts, new Date(to)));
    }

    const whereClause =
      whereConditions.length > 0 ? and(...whereConditions) : undefined;

    const rows = await db
      .select()
      .from(auditLogs)
      .where(whereClause)
      .orderBy(auditLogs.ts)
      .limit(500);

    logger.info('Audit logs retrieved', {
      count: rows.length,
      filters: { userId, resource, action, status, from, to },
    });

    res.json({ data: rows });
  })
);

export { router as auditRoutes };
