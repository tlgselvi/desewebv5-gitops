import { Router } from 'express';
import { checkDatabaseConnection } from '@/db/index.js';
import { logger } from '@/utils/logger.js';
const router = Router();
/**
 * @swagger
 * /health:
 *   get:
 *     summary: Health check endpoint
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Service is healthy
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/HealthCheck'
 *       503:
 *         description: Service is unhealthy
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/HealthCheck'
 */
router.get('/', async (req, res) => {
    try {
        const dbStatus = await checkDatabaseConnection();
        const healthStatus = {
            status: dbStatus ? 'healthy' : 'unhealthy',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            version: process.env.npm_package_version || '5.0.0',
            environment: process.env.NODE_ENV || 'development',
            database: dbStatus ? 'connected' : 'disconnected',
            memory: {
                used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
                total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
            },
            services: {
                database: dbStatus,
                redis: true, // TODO: Add Redis health check
                openai: !!process.env.OPENAI_API_KEY,
                lighthouse: true,
            },
        };
        res.status(dbStatus ? 200 : 503).json(healthStatus);
    }
    catch (error) {
        logger.error('Health check failed', { error });
        res.status(503).json({
            status: 'unhealthy',
            timestamp: new Date().toISOString(),
            error: 'Health check failed',
        });
    }
});
/**
 * @swagger
 * /health/ready:
 *   get:
 *     summary: Readiness probe
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Service is ready
 *       503:
 *         description: Service is not ready
 */
router.get('/ready', async (req, res) => {
    try {
        const dbStatus = await checkDatabaseConnection();
        if (dbStatus) {
            res.status(200).json({ status: 'ready' });
        }
        else {
            res.status(503).json({ status: 'not ready' });
        }
    }
    catch (error) {
        res.status(503).json({ status: 'not ready', error: error.message });
    }
});
/**
 * @swagger
 * /health/live:
 *   get:
 *     summary: Liveness probe
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Service is alive
 */
router.get('/live', (req, res) => {
    res.status(200).json({ status: 'alive' });
});
export { router as healthRoutes };
//# sourceMappingURL=health.js.map