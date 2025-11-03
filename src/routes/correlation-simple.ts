import { Router } from 'express';
import { asyncHandler } from '@/middleware/errorHandler.js';
import { computeCorrelation, storeMetricPoint } from '@/services/aiops/correlationService.js';
import { logger } from '@/utils/logger.js';

const router = Router();

/**
 * GET /api/v1/ai/correlation
 * Compute correlation scores from Redis metrics window
 * Simple correlation endpoint for Sprint 2.6
 */
router.get(
  '/api/v1/ai/correlation',
  asyncHandler(async (_req, res) => {
    try {
      const result = await computeCorrelation();

      res.status(200).json({
        status: 'ok',
        message: 'Correlation computed',
        correlation: {
          pearson: result.pearson,
          spearman: result.spearman,
          anomalyRate: result.anomalyRate,
          dataPoints: result.dataPoints,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Error computing correlation', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  })
);

/**
 * POST /api/v1/ai/correlation/data
 * Store metric data point in Redis window
 */
router.post(
  '/api/v1/ai/correlation/data',
  asyncHandler(async (req, res) => {
    try {
      const { metricA, metricB, timestamp } = req.body;

      if (typeof metricA !== 'number' || typeof metricB !== 'number') {
        res.status(400).json({
          status: 'error',
          message: 'metricA and metricB must be numbers',
        });
        return;
      }

      await storeMetricPoint(metricA, metricB, timestamp);

      res.status(201).json({
        status: 'ok',
        message: 'Metric data point stored',
      });
    } catch (error) {
      logger.error('Error storing metric data point', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  })
);

export { router as correlationSimpleRoutes };
