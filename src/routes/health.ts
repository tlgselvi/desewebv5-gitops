import { Router } from 'express';
import { checkDatabaseConnection } from '@/db/index.js';
import { redis } from '@/services/storage/redisClient.js';
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
      version: process.env.npm_package_version || '6.8.0',
      environment: process.env.NODE_ENV || 'development',
      database: dbStatus ? 'connected' : 'disconnected',
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
      },
      services: {
        database: dbStatus,
        redis: await (async () => {
          try {
            await redis.ping();
            return true;
          } catch {
            return false;
          }
        })(),
        openai: !!process.env.OPENAI_API_KEY,
        lighthouse: true,
      },
    };

    res.status(dbStatus ? 200 : 503).json(healthStatus);
  } catch (error) {
    logger.error('Health check failed', {
      error: error instanceof Error ? error.message : String(error),
    });
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
    
    // Check Redis connection
    let redisStatus = false;
    try {
      await redis.ping();
      redisStatus = true;
    } catch {
      redisStatus = false;
    }
    
    // Ready if both database and Redis are connected
    if (dbStatus && redisStatus) {
      res.status(200).json({ 
        status: 'ready',
        database: 'connected',
        redis: 'connected',
      });
    } else {
      res.status(503).json({ 
        status: 'not ready',
        database: dbStatus ? 'connected' : 'disconnected',
        redis: redisStatus ? 'connected' : 'disconnected',
      });
    }
  } catch (error) {
    res.status(503).json({ 
      status: 'not ready', 
      error: error instanceof Error ? error.message : 'Unknown error',
    });
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
