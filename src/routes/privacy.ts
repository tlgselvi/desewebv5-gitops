import { Router } from 'express';
import { asyncHandler } from '@/middleware/errorHandler.js';
import { withAuth } from '@/rbac/decorators.js';
import { setAuditContext } from '@/middleware/audit.js';
import { requestDeletion, processDeletion } from '@/privacy/delete.js';
import { requestExport, processExport } from '@/privacy/export.js';
import { setConsent, getConsents } from '@/privacy/consent.js';
import {
  anonymizeUserData,
  anonymizeOldAuditLogs,
  getAnonymizationStats,
} from '@/privacy/anonymize.js';
import { anonymizeRoutes } from '@/routes/privacy/anonymize.js';
import type { AuthenticatedRequest } from '@/middleware/auth.js';
import { logger } from '@/utils/logger.js';
import { z } from 'zod';

const router = Router();

/**
 * @swagger
 * /api/v1/privacy/export:
 *   post:
 *     summary: Request user data export (GDPR/KVKK)
 *     tags: [Privacy]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Export request created and processed
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 */
router.post(
  '/export',
  setAuditContext('privacy', 'export'),
  ...withAuth('*', 'read'),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'unauthenticated' });
    }

    await requestExport(userId);
    const fileUrl = await processExport(userId);

    logger.info('GDPR export completed', {
      userId,
      fileUrl,
    });

    res.json({
      ok: true,
      fileUrl,
      message: 'Your data export is ready',
    });
  })
);

/**
 * @swagger
 * /api/v1/privacy/delete:
 *   post:
 *     summary: Request user data deletion (GDPR/KVKK)
 *     tags: [Privacy]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Deletion request created and processed
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 */
router.post(
  '/delete',
  setAuditContext('privacy', 'delete'),
  ...withAuth('*', 'delete'),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'unauthenticated' });
    }

    await requestDeletion(userId);
    await processDeletion(userId);

    logger.info('GDPR deletion completed', {
      userId,
    });

    res.json({
      ok: true,
      message: 'Your data has been deleted',
    });
  })
);

/**
 * @swagger
 * /api/v1/privacy/consent:
 *   put:
 *     summary: Update user consent
 *     tags: [Privacy]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [purpose, status]
 *             properties:
 *               purpose:
 *                 type: string
 *                 enum: [marketing, analytics, essential]
 *               status:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Consent updated
 */
router.put(
  '/consent',
  setAuditContext('privacy', 'consent'),
  ...withAuth('*', 'write'),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { purpose, status } = req.body as {
      purpose: 'marketing' | 'analytics' | 'essential';
      status: boolean;
    };
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'unauthenticated' });
    }

    if (!purpose || typeof status !== 'boolean') {
      return res.status(400).json({
        error: 'invalid_request',
        message: 'purpose and status are required',
      });
    }

    await setConsent(userId, purpose, status);

    logger.info('Consent updated via API', {
      userId,
      purpose,
      status,
    });

    res.json({
      ok: true,
      message: 'Consent updated',
    });
  })
);

/**
 * @swagger
 * /api/v1/privacy/consent:
 *   get:
 *     summary: Get user consents
 *     tags: [Privacy]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User consents
 */
router.get(
  '/consent',
  setAuditContext('privacy', 'read'),
  ...withAuth('*', 'read'),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'unauthenticated' });
    }

    const userConsents = await getConsents(userId);

    logger.debug('Consents retrieved', {
      userId,
      count: userConsents.length,
    });

    res.json({
      data: userConsents,
    });
  })
);

/**
 * @swagger
 * /api/v1/privacy/anonymize:
 *   post:
 *     summary: Anonymize user data (GDPR/KVKK)
 *     tags: [Privacy]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User data anonymized
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.post(
  '/anonymize',
  setAuditContext('privacy', 'anonymize'),
  ...withAuth('*', 'write'),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'unauthenticated' });
    }

    await anonymizeUserData(userId);

    logger.info('User data anonymization completed', {
      userId,
    });

    res.json({
      ok: true,
      message: 'User data has been anonymized',
    });
  })
);

/**
 * @swagger
 * /api/v1/privacy/anonymize/old-logs:
 *   post:
 *     summary: Anonymize old audit logs (admin only)
 *     tags: [Privacy]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               retentionDays:
 *                 type: number
 *                 default: 400
 *     responses:
 *       200:
 *         description: Old audit logs anonymized
 */
const anonymizeOldLogsSchema = z.object({
  retentionDays: z.number().int().positive().optional().default(400),
});

router.post(
  '/anonymize/old-logs',
  setAuditContext('privacy', 'anonymize_old_logs'),
  ...withAuth('system.audit', 'write'),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const validated = anonymizeOldLogsSchema.parse(req.body);
    const rowsAffected = await anonymizeOldAuditLogs(validated.retentionDays);

    logger.info('Old audit logs anonymization completed', {
      retentionDays: validated.retentionDays,
      rowsAffected,
    });

    res.json({
      ok: true,
      message: 'Old audit logs anonymized',
      rowsAffected,
    });
  })
);

/**
 * @swagger
 * /api/v1/privacy/anonymize/stats:
 *   get:
 *     summary: Get anonymization statistics (admin only)
 *     tags: [Privacy]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Anonymization statistics
 */
router.get(
  '/anonymize/stats',
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

// Mount anonymization routes
router.use('/anonymize', anonymizeRoutes);

export { router as privacyRoutes };

