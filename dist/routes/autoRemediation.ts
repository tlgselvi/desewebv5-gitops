import { Router, Request, Response } from 'express';
import { AutoRemediator } from '../services/aiops/autoRemediator.js';
import { logger } from '../utils/logger.js';

const router = Router();
const remediator = new AutoRemediator();

/**
 * POST /api/v1/aiops/remediate
 * Execute auto-remediation
 */
router.post('/aiops/remediate', (req: Request, res: Response): void => {
  try {
    const { metric, severity } = req.body;

    if (!metric || !severity) {
      res.status(400).json({
        success: false,
        error: 'Missing required fields: metric and severity',
      });
      return;
    }

    const action = remediator.suggestAction(metric, severity);
    
    remediator.recordEvent({
      timestamp: Date.now(),
      metric,
      action,
      severity: severity as 'low' | 'medium' | 'high',
      status: 'executed',
    });

    logger.info('Auto-remediation executed', {
      metric,
      severity,
      action,
    });

    res.status(200).json({
      success: true,
      action,
      timestamp: Date.now(),
    });
  } catch (error) {
    logger.error('Error executing auto-remediation', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to execute auto-remediation',
    });
  }
});

/**
 * GET /api/v1/aiops/remediation-log
 * Get remediation log (replay)
 */
router.get('/aiops/remediation-log', (_req: Request, res: Response): void => {
  try {
    const events = remediator.replay();

    res.status(200).json({
      success: true,
      count: events.length,
      events,
    });
  } catch (error) {
    logger.error('Error retrieving remediation log', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve remediation log',
    });
  }
});

export { router as autoRemediationRoutes };

