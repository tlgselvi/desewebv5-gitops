import { Router } from 'express';
import { asyncHandler } from '@/middleware/errorHandler.js';
import { withAuth } from '@/rbac/decorators.js';
import { setAuditContext } from '@/middleware/audit.js';
import {
  anonymizeUserData,
  anonymizeOldAuditLogs,
  getAnonymizationStats,
} from '@/privacy/anonymize.js';
import {
  startAnonymizationScheduler,
  stopAnonymizationScheduler,
  getSchedulerStatus,
  runImmediateAnonymization,
} from '@/services/privacy/anonymizationScheduler.js';
import type { AuthenticatedRequest } from '@/middleware/auth.js';
import { logger } from '@/utils/logger.js';
import { z } from 'zod';

/**
 * GDPR Anonymization Routes
 * Phase-5 Sprint 2: Task 2.2
 * 
 * Provides endpoints for:
 * - User data anonymization
 * - Old logs anonymization
 * - Scheduler management
 * - Anonymization statistics
 */

const router = Router();

const anonymizeUserSchema = z.object({
  userId: z.string().uuid('Invalid user ID format'),
});

const anonymizeOldLogsSchema = z.object({
  retentionDays: z.number().int().positive().optional().default(400),
});

const immediateAnonymizationSchema = z.object({
  type: z.enum(['user', 'old_logs', 'deletion_requests']),
  userId: z.string().uuid().optional(),
  retentionDays: z.number().int().positive().optional(),
});

/**
 * POST /api/v1/privacy/anonymize/user
 * Anonymize specific user data
 */
router.post(
  '/user',
  setAuditContext('privacy', 'anonymize_user'),
  ...withAuth('system.audit', 'write'),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const validated = anonymizeUserSchema.parse(req.body);
    const authReq = req as AuthenticatedRequest;

    await anonymizeUserData(validated.userId);

    logger.info('User data anonymization completed via API', {
      userId: validated.userId,
      requestedBy: authReq.user?.id,
    });

    res.json({
      ok: true,
      message: 'User data has been anonymized',
      userId: validated.userId,
    });
  })
);

/**
 * POST /api/v1/privacy/anonymize/old-logs
 * Anonymize old audit logs (admin only)
 */
router.post(
  '/old-logs',
  setAuditContext('privacy', 'anonymize_old_logs'),
  ...withAuth('system.audit', 'write'),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const validated = anonymizeOldLogsSchema.parse(req.body);
    const authReq = req as AuthenticatedRequest;

    const rowsAffected = await anonymizeOldAuditLogs(validated.retentionDays);

    logger.info('Old audit logs anonymization completed via API', {
      retentionDays: validated.retentionDays,
      rowsAffected,
      requestedBy: authReq.user?.id,
    });

    res.json({
      ok: true,
      message: 'Old audit logs anonymized',
      retentionDays: validated.retentionDays,
      rowsAffected,
    });
  })
);

/**
 * POST /api/v1/privacy/anonymize/immediate
 * Run immediate anonymization job
 */
router.post(
  '/immediate',
  setAuditContext('privacy', 'anonymize_immediate'),
  ...withAuth('system.audit', 'write'),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const validated = immediateAnonymizationSchema.parse(req.body);
    const authReq = req as AuthenticatedRequest;

    const result = await runImmediateAnonymization(validated.type, {
      userId: validated.userId,
      retentionDays: validated.retentionDays,
    });

    if (!result.success) {
      return res.status(500).json({
        ok: false,
        error: result.error || 'Anonymization failed',
      });
    }

    logger.info('Immediate anonymization completed', {
      type: validated.type,
      requestedBy: authReq.user?.id,
      result,
    });

    res.json({
      ok: true,
      message: 'Anonymization completed',
      type: validated.type,
      result,
    });
  })
);

/**
 * GET /api/v1/privacy/anonymize/stats
 * Get anonymization statistics (admin only)
 */
router.get(
  '/stats',
  setAuditContext('privacy', 'anonymize_stats'),
  ...withAuth('system.audit', 'read'),
  asyncHandler(async (_req: AuthenticatedRequest, res) => {
    const stats = await getAnonymizationStats();

    res.json({
      ok: true,
      data: stats,
    });
  })
);

/**
 * GET /api/v1/privacy/anonymize/scheduler/status
 * Get scheduler status
 */
router.get(
  '/scheduler/status',
  setAuditContext('privacy', 'anonymize_scheduler_status'),
  ...withAuth('system.audit', 'read'),
  asyncHandler(async (_req: AuthenticatedRequest, res) => {
    const status = getSchedulerStatus();

    res.json({
      ok: true,
      data: status,
    });
  })
);

/**
 * POST /api/v1/privacy/anonymize/scheduler/start
 * Start anonymization scheduler (admin only)
 */
router.post(
  '/scheduler/start',
  setAuditContext('privacy', 'anonymize_scheduler_start'),
  ...withAuth('system.audit', 'write'),
  asyncHandler(async (_req: AuthenticatedRequest, res) => {
    startAnonymizationScheduler();

    logger.info('Anonymization scheduler started via API');

    res.json({
      ok: true,
      message: 'Anonymization scheduler started',
    });
  })
);

/**
 * POST /api/v1/privacy/anonymize/scheduler/stop
 * Stop anonymization scheduler (admin only)
 */
router.post(
  '/scheduler/stop',
  setAuditContext('privacy', 'anonymize_scheduler_stop'),
  ...withAuth('system.audit', 'write'),
  asyncHandler(async (_req: AuthenticatedRequest, res) => {
    stopAnonymizationScheduler();

    logger.info('Anonymization scheduler stopped via API');

    res.json({
      ok: true,
      message: 'Anonymization scheduler stopped',
    });
  })
);

export { router as anonymizeRoutes };

