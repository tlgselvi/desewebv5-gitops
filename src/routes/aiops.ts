import { Router, Request, Response } from 'express';
import { TelemetryAgent } from '../services/aiops/telemetryAgent.js';
import { logger } from '../utils/logger.js';

const router = Router();
const agent = new TelemetryAgent();

/**
 * GET /api/v1/aiops/collect
 * Collect AIOps metrics and detect drift
 * Query params:
 *   - threshold: Optional drift threshold (default: 0.05)
 */
router.get('/collect', async (req: Request, res: Response): Promise<void> => {
  try {
    // Get threshold from query params (optional, default 0.05)
    const threshold = req.query.threshold 
      ? parseFloat(req.query.threshold as string) 
      : 0.05;

    // Validate threshold
    if (isNaN(threshold) || threshold < 0) {
      res.status(400).json({
        success: false,
        error: 'Invalid threshold. Must be a positive number.',
      });
      return;
    }

    const telemetryData = await agent.getSystemState(threshold);
    
    logger.info('AIOps telemetry data collected', {
      avgLatency: telemetryData.avgLatency,
      drift: telemetryData.drift,
      threshold,
    });

    res.status(200).json({
      success: true,
      data: telemetryData,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Error collecting AIOps telemetry', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to collect AIOps telemetry data',
    });
  }
});

/**
 * GET /api/v1/aiops/health
 * Check AIOps agent health
 */
router.get('/health', async (req: Request, res: Response): Promise<void> => {
  try {
    const data = await agent.collectMetrics();
    const hasData = data && Object.keys(data).length > 0;
    
    res.status(200).json({
      success: true,
      healthy: hasData,
      message: hasData ? 'AIOps agent is healthy' : 'AIOps agent is not receiving data',
    });
  } catch (error) {
    logger.error('Error checking AIOps health', { error });
    res.status(500).json({
      success: false,
      healthy: false,
      error: 'AIOps agent health check failed',
    });
  }
});

export { router as aiopsRoutes };

