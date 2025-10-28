import { Router, Request, Response } from 'express';
import { logger } from '@/utils/logger';
import CorrelationEngine from '../services/aiops/correlationEngine.js';
import PredictiveRemediator from '../services/aiops/predictiveRemediator.js';

const router = Router();
const correlationEngine = new CorrelationEngine();
const predictiveRemediator = new PredictiveRemediator(correlationEngine);

/**
 * POST /api/v1/aiops/predict/severity
 * Classify severity based on anomaly and correlation scores
 */
router.post('/predict/severity', async (req: Request, res: Response): Promise<void> => {
  try {
    const { correlationScore, anomalyScore, trendDirection, remarks } = req.body;

    if (correlationScore === undefined || anomalyScore === undefined) {
      res.status(400).json({
        success: false,
        error: 'correlationScore and anomalyScore are required'
      });
      return;
    }

    const features = {
      correlationScore,
      anomalyScore,
      trendDirection: trendDirection || 0.5,
      remarks: remarks || ''
    };

    const prediction = predictiveRemediator.classifySeverity(features);

    logger.info('Severity classification', {
      severity: prediction.severity,
      confidence: prediction.confidence
    });

    res.status(200).json({
      success: true,
      prediction
    });
  } catch (error) {
    logger.error('Error classifying severity', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to classify severity'
    });
  }
});

/**
 * POST /api/v1/aiops/predict/actions
 * Get action recommendations based on correlations and severity
 */
router.post('/predict/actions', async (req: Request, res: Response): Promise<void> => {
  try {
    const { targetMetric, correlatedMetrics, severity } = req.body;

    if (!targetMetric || !correlatedMetrics || !Array.isArray(correlatedMetrics)) {
      res.status(400).json({
        success: false,
        error: 'targetMetric and correlatedMetrics array are required'
      });
      return;
    }

    const actions = await predictiveRemediator.recommendActions(
      targetMetric,
      correlatedMetrics,
      severity
    );

    logger.info('Action recommendations generated', {
      targetMetric,
      actionsCount: actions.length
    });

    res.status(200).json({
      success: true,
      targetMetric,
      actions
    });
  } catch (error) {
    logger.error('Error generating action recommendations', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to generate action recommendations'
    });
  }
});

/**
 * POST /api/v1/aiops/predict/strategy
 * Get complete remediation strategy
 */
router.post('/predict/strategy', async (req: Request, res: Response): Promise<void> => {
  try {
    const { targetMetric, metrics, snapshot } = req.body;

    if (!targetMetric || !metrics || !Array.isArray(metrics) || !snapshot) {
      res.status(400).json({
        success: false,
        error: 'targetMetric, metrics array, and snapshot are required'
      });
      return;
    }

    const strategy = await predictiveRemediator.getRemediationStrategy(
      targetMetric,
      metrics,
      snapshot
    );

    logger.info('Remediation strategy generated', {
      targetMetric,
      severity: strategy.severity.severity,
      actionsCount: strategy.actions.length
    });

    res.status(200).json({
      success: true,
      strategy
    });
  } catch (error) {
    logger.error('Error generating remediation strategy', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to generate remediation strategy'
    });
  }
});

/**
 * POST /api/v1/aiops/predict/confidence
 * Calculate confidence score for recommendations
 */
router.post('/predict/confidence', async (req: Request, res: Response): Promise<void> => {
  try {
    const { correlationScore, anomalyScore, trendDirection } = req.body;

    if (correlationScore === undefined || anomalyScore === undefined) {
      res.status(400).json({
        success: false,
        error: 'correlationScore and anomalyScore are required'
      });
      return;
    }

    const features = {
      correlationScore,
      anomalyScore,
      trendDirection: trendDirection || 0.5,
      remarks: ''
    };

    const confidence = predictiveRemediator.calculateConfidence(features);

    logger.info('Confidence score calculated', { confidence });

    res.status(200).json({
      success: true,
      confidence: Math.round(confidence * 1000) / 1000
    });
  } catch (error) {
    logger.error('Error calculating confidence', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to calculate confidence'
    });
  }
});

/**
 * POST /api/v1/aiops/predict/prioritize
 * Prioritize remediation actions
 */
router.post('/predict/prioritize', async (req: Request, res: Response): Promise<void> => {
  try {
    const { actions } = req.body;

    if (!actions || !Array.isArray(actions)) {
      res.status(400).json({
        success: false,
        error: 'actions array is required'
      });
      return;
    }

    const prioritized = predictiveRemediator.prioritizeRemediations(actions);

    logger.info('Actions prioritized', {
      actionsCount: prioritized.length
    });

    res.status(200).json({
      success: true,
      actions: prioritized
    });
  } catch (error) {
    logger.error('Error prioritizing actions', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to prioritize actions'
    });
  }
});

export { router as predictiveRoutes };

