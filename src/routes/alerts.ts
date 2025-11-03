import { Router, Request, Response } from 'express';
import { asyncHandler } from '@/middleware/errorHandler.js';
import { logger } from '@/utils/logger.js';
import { redis } from '@/services/storage/redisClient.js';
import { randomUUID } from 'crypto';

const router = Router();

/**
 * Alertmanager webhook endpoint
 * URL: POST /api/v1/alerts/webhook
 * Amaç: Prometheus'tan gelen uyarıları alır, Redis Streams'e yazar.
 * 
 * @swagger
 * /api/v1/alerts/webhook:
 *   post:
 *     summary: Receive alerts from Alertmanager
 *     tags: [Alerts]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               alerts:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     labels:
 *                       type: object
 *                     annotations:
 *                       type: object
 *                     status:
 *                       type: string
 *                     startsAt:
 *                       type: string
 *                     endsAt:
 *                       type: string
 *     responses:
 *       200:
 *         description: Alerts received and processed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 received:
 *                   type: number
 *       400:
 *         description: Invalid request body
 *       500:
 *         description: Internal server error
 */
router.post(
  '/webhook',
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { alerts = [] } = req.body;

    if (!Array.isArray(alerts)) {
      logger.warn('Invalid alerts payload', { body: req.body });
      res.status(400).json({
        error: 'invalid_payload',
        message: 'alerts must be an array',
      });
      return;
    }

    const processedAlerts = [];

    for (const alert of alerts) {
      try {
        const id = randomUUID();
        const payload = {
          id,
          alertname: alert.labels?.alertname || 'unknown',
          severity: alert.labels?.severity || 'none',
          service: alert.labels?.service || 'unknown',
          component: alert.labels?.component || 'unknown',
          instance: alert.labels?.instance || 'unknown',
          status: alert.status || 'unknown',
          summary: alert.annotations?.summary || '',
          description: alert.annotations?.description || '',
          startsAt: alert.startsAt || new Date().toISOString(),
          endsAt: alert.endsAt || null,
          timestamp: new Date().toISOString(),
        };

        // Redis Streams'e gönder (dese.alerts stream'i)
        await addToStream('dese.alerts', {
          eventId: id,
          source: 'alertmanager',
          type: 'prometheus.alert',
          severity: payload.severity,
          alertname: payload.alertname,
          payload: JSON.stringify(payload),
          timestamp: payload.timestamp,
        });

        // Logla
        logger.info('Prometheus alert received', {
          alertId: id,
          alertname: payload.alertname,
          severity: payload.severity,
          status: payload.status,
          service: payload.service,
        });

        processedAlerts.push(id);
      } catch (error) {
        logger.error('Failed to process alert', {
          error: error instanceof Error ? error.message : String(error),
          alert: alert,
        });
        // Continue processing other alerts even if one fails
      }
    }

    res.status(200).json({
      received: alerts.length,
      processed: processedAlerts.length,
      alertIds: processedAlerts,
    });
  })
);

/**
 * Get recent alerts from Redis Stream
 * URL: GET /api/v1/alerts
 * 
 * @swagger
 * /api/v1/alerts:
 *   get:
 *     summary: Get recent alerts from Redis Stream
 *     tags: [Alerts]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *         description: Maximum number of alerts to return
 *     responses:
 *       200:
 *         description: List of recent alerts
 */
router.get(
  '/',
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const limit = parseInt(req.query.limit as string) || 50;
    
    try {
      // Redis Stream'den son alertleri oku
      const streamKey = 'dese.alerts';
      const messages = await getFromStream(streamKey, '+', '-', limit);

      const alerts = messages.map((message) => {
        try {
          return {
            id: message.fields.eventId,
            streamId: message.id,
            source: message.fields.source,
            type: message.fields.type,
            severity: message.fields.severity,
            alertname: message.fields.alertname,
            payload: JSON.parse(message.fields.payload),
            timestamp: message.fields.timestamp,
          };
        } catch (error) {
          logger.warn('Failed to parse alert payload', {
            messageId: message.id,
            error: error instanceof Error ? error.message : String(error),
          });
          return null;
        }
      }).filter((alert) => alert !== null);

      res.status(200).json({
        alerts,
        count: alerts.length,
        limit,
      });
    } catch (error) {
      logger.error('Failed to fetch alerts', {
        error: error instanceof Error ? error.message : String(error),
      });
      res.status(500).json({
        error: 'internal_error',
        message: 'Failed to fetch alerts from Redis Stream',
      });
    }
  })
);

export { router as alertsRoutes };

