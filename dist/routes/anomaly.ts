import { Router, Request, Response } from 'express';
import { logger } from '@/utils/logger';
import AnomalyDetector from '../services/aiops/anomalyDetector.js';

const router = Router();
const anomalyDetector = new AnomalyDetector();

/**
 * POST /api/v1/aiops/anomalies/p95
 * Detect p95 percentile anomalies
 */
router.post('/anomalies/p95', async (req: Request, res: Response): Promise<void> => {
  try {
    const { values, timestamps } = req.body;

    if (!values || !Array.isArray(values)) {
      res.status(400).json({
        success: false,
        error: 'values array is required'
      });
      return;
    }

    const data = {
      values,
      timestamps: timestamps || values.map((_, i) => Date.now() - (values.length - i) * 1000)
    };

    const result = anomalyDetector.detectp95Anomaly(data);

    logger.info('P95 anomaly detected', {
      isAnomaly: result.result?.isAnomaly,
      severity: result.result?.severity,
      score: result.result?.score
    });

    res.status(200).json({
      success: true,
      anomaly: result.result,
      percentiles: result.percentiles
    });
  } catch (error) {
    logger.error('Error detecting p95 anomaly', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to detect p95 anomaly'
    });
  }
});

/**
 * POST /api/v1/aiops/anomalies/p99
 * Detect p99 percentile anomalies
 */
router.post('/anomalies/p99', async (req: Request, res: Response): Promise<void> => {
  try {
    const { values, timestamps } = req.body;

    if (!values || !Array.isArray(values)) {
      res.status(400).json({
        success: false,
        error: 'values array is required'
      });
      return;
    }

    const data = {
      values,
      timestamps: timestamps || values.map((_, i) => Date.now() - (values.length - i) * 1000)
    };

    const result = anomalyDetector.detectp99Anomaly(data);

    logger.info('P99 anomaly detected', {
      isAnomaly: result.result?.isAnomaly,
      severity: result.result?.severity,
      score: result.result?.score
    });

    res.status(200).json({
      success: true,
      anomaly: result.result,
      percentiles: result.percentiles
    });
  } catch (error) {
    logger.error('Error detecting p99 anomaly', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to detect p99 anomaly'
    });
  }
});

/**
 * POST /api/v1/aiops/anomalies/aggregate
 * Aggregate anomaly scores
 */
router.post('/anomalies/aggregate', async (req: Request, res: Response): Promise<void> => {
  try {
    const { scores } = req.body;

    if (!scores || !Array.isArray(scores)) {
      res.status(400).json({
        success: false,
        error: 'scores array is required'
      });
      return;
    }

    const aggregated = anomalyDetector.aggregateAnomalyScores(scores);

    logger.info('Anomaly scores aggregated', {
      totalScores: scores.length,
      criticalCount: aggregated.criticalCount,
      highCount: aggregated.highCount,
      aggregatedScore: aggregated.aggregatedScore
    });

    res.status(200).json({
      success: true,
      aggregated
    });
  } catch (error) {
    logger.error('Error aggregating anomaly scores', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to aggregate anomaly scores'
    });
  }
});

/**
 * POST /api/v1/aiops/anomalies/critical
 * Identify critical anomalies
 */
router.post('/anomalies/critical', async (req: Request, res: Response): Promise<void> => {
  try {
    const { anomalies } = req.body;

    if (!anomalies || !Array.isArray(anomalies)) {
      res.status(400).json({
        success: false,
        error: 'anomalies array is required'
      });
      return;
    }

    const critical = anomalyDetector.identifyCriticalAnomalies(anomalies);

    logger.info('Critical anomalies identified', {
      totalServices: anomalies.length,
      criticalCount: critical.length
    });

    res.status(200).json({
      success: true,
      critical,
      count: critical.length
    });
  } catch (error) {
    logger.error('Error identifying critical anomalies', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to identify critical anomalies'
    });
  }
});

/**
 * POST /api/v1/aiops/anomalies/trend
 * Detect trend deviation
 */
router.post('/anomalies/trend', async (req: Request, res: Response): Promise<void> => {
  try {
    const { values, timestamps, windowSize } = req.body;

    if (!values || !Array.isArray(values)) {
      res.status(400).json({
        success: false,
        error: 'values array is required'
      });
      return;
    }

    const data = {
      values,
      timestamps: timestamps || values.map((_, i) => Date.now() - (values.length - i) * 1000)
    };

    const trend = anomalyDetector.detectTrendDeviation(data, windowSize || 10);

    logger.info('Trend deviation detected', {
      trend: trend.trend,
      deviation: trend.deviation,
      isSignificant: trend.isSignificant
    });

    res.status(200).json({
      success: true,
      trend
    });
  } catch (error) {
    logger.error('Error detecting trend deviation', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to detect trend deviation'
    });
  }
});

/**
 * POST /api/v1/aiops/anomalies/timeline
 * Generate anomaly timeline for visualization
 */
router.post('/anomalies/timeline', async (req: Request, res: Response): Promise<void> => {
  try {
    const { scores, timeRange } = req.body;

    if (!scores || !Array.isArray(scores)) {
      res.status(400).json({
        success: false,
        error: 'scores array is required'
      });
      return;
    }

    const timeline = anomalyDetector.generateAnomalyTimeline(scores, timeRange);

    logger.info('Anomaly timeline generated', {
      dataPoints: timeline.timeline.length,
      totalAnomalies: timeline.summary.totalAnomalies,
      criticalAnomalies: timeline.summary.criticalAnomalies
    });

    res.status(200).json({
      success: true,
      timeline
    });
  } catch (error) {
    logger.error('Error generating anomaly timeline', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to generate anomaly timeline'
    });
  }
});

export { router as anomalyRoutes };

