import { Router } from 'express';
import { metricsHandler, recordUserAction } from '@/middleware/prometheus.js';
import { logger } from '@/utils/logger.js';
const router = Router();
// GET metrics endpoint for Prometheus scraping
router.get('/', metricsHandler);
// POST metrics endpoint for collecting user actions
router.post('/', async (req, res) => {
    try {
        const { action } = req.body;
        if (action) {
            recordUserAction(action);
            logger.info('User action recorded', { action });
        }
        res.status(200).json({ status: 'logged' });
    }
    catch (error) {
        logger.error('Error logging metric', { error });
        res.status(500).json({ error: 'Failed to log metric' });
    }
});
export { router as metricsRoutes };
//# sourceMappingURL=metrics.js.map