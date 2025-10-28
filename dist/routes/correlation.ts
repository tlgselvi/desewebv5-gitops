import { Router, Request, Response } from 'express';
import { logger } from '@/utils/logger';
import CorrelationEngine from '@/services/aiops/correlationEngine';

const router = Router();
const correlationEngine = new CorrelationEngine();

/**
 * POST /api/v1/aiops/correlation/calculate
 * Calculate correlation between two metrics
 */
router.post('/correlation/calculate', async (req: Request, res: Response): Promise<void> => {
  try {
    const { metric1, metric2, timeRange = '1h' } = req.body;

    if (!metric1 || !metric2) {
      res.status(400).json({
        success: false,
        error: 'metric1 and metric2 are required'
      });
      return;
    }

    const correlation = await correlationEngine.calculateCorrelation(metric1, metric2, timeRange);

    logger.info('Correlation calculated', {
      metric1,
      metric2,
      pearson: correlation.pearson,
      strength: correlation.strength
    });

    res.status(200).json({
      success: true,
      correlation
    });
  } catch (error) {
    logger.error('Error calculating correlation', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to calculate correlation'
    });
  }
});

/**
 * POST /api/v1/aiops/correlation/matrix
 * Generate correlation matrix for multiple metrics
 */
router.post('/correlation/matrix', async (req: Request, res: Response): Promise<void> => {
  try {
    const { metrics, timeRange = '1h' } = req.body;

    if (!metrics || !Array.isArray(metrics) || metrics.length < 2) {
      res.status(400).json({
        success: false,
        error: 'metrics array with at least 2 metrics is required'
      });
      return;
    }

    const matrix = await correlationEngine.generateCorrelationMatrix(metrics, timeRange);

    logger.info('Correlation matrix generated', {
      metrics: metrics.length,
      correlations: matrix.correlations.length
    });

    res.status(200).json({
      success: true,
      matrix
    });
  } catch (error) {
    logger.error('Error generating correlation matrix', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to generate correlation matrix'
    });
  }
});

/**
 * GET /api/v1/aiops/correlation/strong
 * Get strong correlations above threshold
 */
router.get('/correlation/strong', async (req: Request, res: Response): Promise<void> => {
  try {
    const { metrics, threshold = '0.7', timeRange = '1h' } = req.query;

    if (!metrics) {
      res.status(400).json({
        success: false,
        error: 'metrics query parameter is required'
      });
      return;
    }

    const metricsArray = (metrics as string).split(',');
    const thresholdNum = parseFloat(threshold as string);

    const strongCorrelations = await correlationEngine.getStrongCorrelations(
      metricsArray,
      thresholdNum,
      timeRange as string
    );

    logger.info('Strong correlations retrieved', {
      metrics: metricsArray.length,
      threshold: thresholdNum,
      strongCorrelations: strongCorrelations.length
    });

    res.status(200).json({
      success: true,
      threshold: thresholdNum,
      correlations: strongCorrelations
    });
  } catch (error) {
    logger.error('Error retrieving strong correlations', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve strong correlations'
    });
  }
});

/**
 * POST /api/v1/aiops/correlation/impact
 * Predict metric impact based on correlations
 */
router.post('/correlation/impact', async (req: Request, res: Response): Promise<void> => {
  try {
    const { targetMetric, metrics, timeRange = '1h' } = req.body;

    if (!targetMetric || !metrics || !Array.isArray(metrics)) {
      res.status(400).json({
        success: false,
        error: 'targetMetric and metrics array are required'
      });
      return;
    }

    const impacts = await correlationEngine.predictMetricImpact(targetMetric, metrics, timeRange);

    logger.info('Metric impact predicted', {
      targetMetric,
      metrics: metrics.length,
      impacts: impacts.length
    });

    res.status(200).json({
      success: true,
      targetMetric,
      impacts
    });
  } catch (error) {
    logger.error('Error predicting metric impact', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to predict metric impact'
    });
  }
});

/**
 * GET /api/v1/aiops/correlation/health
 * Health check for correlation engine
 */
router.get('/correlation/health', async (req: Request, res: Response): Promise<void> => {
  try {
    // Test with sample metrics
    const testMetrics = ['http_requests_total', 'http_request_duration_seconds'];
    
    try {
      await correlationEngine.generateCorrelationMatrix(testMetrics, '5m');
      
      res.status(200).json({
        success: true,
        status: 'healthy',
        message: 'Correlation engine operational'
      });
    } catch (error) {
      res.status(503).json({
        success: false,
        status: 'unhealthy',
        error: 'Correlation engine test failed'
      });
    }
  } catch (error) {
    logger.error('Error checking correlation engine health', { error });
    res.status(500).json({
      success: false,
      error: 'Health check failed'
    });
  }
});

export { router as correlationRoutes };

