import { Router } from 'express';
import { asyncHandler } from '@/middleware/errorHandler.js';
import { withAuth } from '@/rbac/decorators.js';
import { setAuditContext } from '@/middleware/audit.js';
import { getStreamStats } from '@/metrics/realtime.js';
import { getWsStats } from '@/ws/gateway.js';
import { logger } from '@/utils/logger.js';

const router = Router();

/**
 * @swagger
 * /api/v1/metrics/realtime:
 *   get:
 *     summary: Get realtime metrics (Redis Streams + WebSocket)
 *     tags: [Metrics]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Realtime metrics data
 */
router.get(
  '/realtime',
  setAuditContext('metrics', 'read'),
  ...withAuth('*', 'read'),
  asyncHandler(async (_req, res) => {
    const streams =
      (process.env.REDIS_STREAMS ?? 'finbot.events,mubot.events,dese.events').split(
        ','
      );

    const [streamStats, ws] = await Promise.all([
      getStreamStats(streams),
      Promise.resolve(getWsStats()),
    ]);

    logger.debug('Realtime metrics retrieved', {
      streamCount: streamStats.length,
      wsConnections: ws.connections,
    });

    res.json({ streamStats, ws });
  })
);

export { router as metricsRealtimeRoutes };

