import { Router } from 'express';
import { metricsHandler, recordUserAction } from '../middleware/prometheus.js';
import { logger } from '../utils/logger.js';
const router = Router();
// GET metrics endpoint for Prometheus scraping
router.get('/', metricsHandler);
// POST metrics endpoint for collecting user actions
router.post('/', async (req, res) => {
    try {
        const { action } = req.body;
        // Validate action parameter
        if (!action || action.trim() === '') {
            res.status(400).json({
                error: 'Action parameter is required and cannot be empty',
            });
            return;
        }
        recordUserAction(action);
        logger.info('User action recorded', { action });
        res.status(200).json({ status: 'logged' });
    }
    catch (error) {
        logger.error('Error logging metric', { error });
        res.status(500).json({ error: 'Failed to log metric' });
    }
});
export { router as metricsRoutes };
//# sourceMappingURL=metrics.js.map