import { Router, Request, Response } from 'express';
import { logger } from '../utils/logger.js';
import { FeedbackStore } from '../services/storage/redisClient.js';
import { recordFeedback } from '../middleware/aiopsMetrics.js';

const router = Router();

/**
 * POST /api/v1/aiops/feedback
 * Submit AIOps feedback
 */
router.post('/aiops/feedback', async (req: Request, res: Response): Promise<void> => {
  try {
    const { metric, anomaly, verdict, comment } = req.body;

    const entry = {
      timestamp: Date.now(),
      metric: metric || 'unknown',
      anomaly: anomaly || false,
      verdict: verdict || false,
      comment: comment || '',
    };

    await FeedbackStore.save(entry);
    
    // Record metric
    recordFeedback(entry.metric, entry.anomaly);

    logger.info('Feedback entry saved to Redis', {
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
router.get('/aiops/feedback', async (_req: Request, res: Response): Promise<void> => {
  try {
    const data = await FeedbackStore.getAll();
    
    res.status(200).json({
      success: true,
      count: data.length,
      feedback: data,
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
router.delete('/aiops/feedback', async (_req: Request, res: Response): Promise<void> => {
  try {
    const deleted = await FeedbackStore.clear();

    logger.info('Feedback log cleared', { deleted });

    res.status(200).json({
      success: true,
      message: `Cleared ${deleted} feedback entries`,
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

