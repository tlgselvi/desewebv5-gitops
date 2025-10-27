import { Router, Request, Response } from 'express';
import { logger } from '../utils/logger.js';

const router = Router();

interface FeedbackEntry {
  timestamp: number;
  metric: string;
  anomaly: boolean;
  verdict: boolean;
  comment: string;
}

let feedbackLog: FeedbackEntry[] = [];

/**
 * POST /api/v1/aiops/feedback
 * Submit AIOps feedback
 */
router.post('/aiops/feedback', (req: Request, res: Response): void => {
  try {
    const { metric, anomaly, verdict, comment } = req.body;

    const entry: FeedbackEntry = {
      timestamp: Date.now(),
      metric: metric || 'unknown',
      anomaly: anomaly || false,
      verdict: verdict || false,
      comment: comment || '',
    };

    feedbackLog.push(entry);

    logger.info('Feedback entry saved', {
      metric: entry.metric,
      anomaly: entry.anomaly,
      verdict: entry.verdict,
    });

    res.status(200).json({
      success: true,
      saved: true,
      entry,
    });
  } catch (error) {
    logger.error('Error saving feedback', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to save feedback',
    });
  }
});

/**
 * GET /api/v1/aiops/feedback
 * Get all feedback entries
 */
router.get('/aiops/feedback', (_req: Request, res: Response): void => {
  try {
    res.status(200).json({
      success: true,
      count: feedbackLog.length,
      feedback: feedbackLog,
    });
  } catch (error) {
    logger.error('Error retrieving feedback', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve feedback',
    });
  }
});

/**
 * DELETE /api/v1/aiops/feedback
 * Clear feedback log
 */
router.delete('/aiops/feedback', (_req: Request, res: Response): void => {
  try {
    const count = feedbackLog.length;
    feedbackLog = [];

    logger.info('Feedback log cleared', { count });

    res.status(200).json({
      success: true,
      message: `Cleared ${count} feedback entries`,
    });
  } catch (error) {
    logger.error('Error clearing feedback', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to clear feedback',
    });
  }
});

export { router as feedbackRoutes };

