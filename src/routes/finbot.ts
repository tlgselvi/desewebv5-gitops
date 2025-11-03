import { Router, Request, Response, NextFunction } from 'express';
import fetch from 'node-fetch';
import { redis } from '@/services/storage/redisClient.js';
import { AuthenticatedRequest } from '@/middleware/auth.js';
import { asyncHandler } from '@/middleware/errorHandler.js';
import { finbotMetricsMiddleware } from '@/middleware/finbotMetrics.js';
import { withAuth } from '@/rbac/decorators.js';
import { setAuditContext } from '@/middleware/audit.js';
import { logger } from '@/utils/logger.js';
import { config } from '@/config/index.js';

const router = Router();

// FinBot-specific Prometheus metrics middleware
router.use(finbotMetricsMiddleware);

// FinBot service base URL from environment or config
const FINBOT_BASE = process.env.FINBOT_BASE || 'http://finbot:8080';

// Cache TTL in seconds
const CACHE_TTL = 60;

/**
 * @swagger
 * /api/v1/finbot/accounts:
 *   get:
 *     summary: Get financial accounts list
 *     tags: [FinBot]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of financial accounts
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 accounts:
 *                   type: array
 *                   items:
 *                     type: object
 *       502:
 *         description: FinBot service unavailable
 *       500:
 *         description: Internal server error
 */
router.get(
  '/accounts',
  setAuditContext('finbot.accounts', 'read'),
  ...withAuth('finbot.accounts', 'read'),
  asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const cacheKey = 'finbot:accounts';
    
    try {
      // Try to get from cache
      const cached = await redis.get(cacheKey);
      if (cached) {
        logger.debug('FinBot accounts retrieved from cache', {
          userId: req.user?.id,
          endpoint: '/accounts',
        });
        res.json(JSON.parse(cached));
        return;
      }

      // Fetch from FinBot service
      logger.info('Fetching FinBot accounts from service', {
        userId: req.user?.id,
        finbotBase: FINBOT_BASE,
      });

      const response = await fetch(`${FINBOT_BASE}/api/v1/finbot/accounts`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 5000, // 5 second timeout
      });

      if (!response.ok) {
        logger.error('FinBot service unavailable', {
          status: response.status,
          statusText: response.statusText,
          userId: req.user?.id,
        });
        res.status(502).json({
          error: 'upstream_unavailable',
          message: 'FinBot service is currently unavailable',
        });
        return;
      }

      const data = await response.json();

      // Cache the response
      await redis.setex(cacheKey, CACHE_TTL, JSON.stringify(data));

      logger.info('FinBot accounts retrieved successfully', {
        userId: req.user?.id,
        accountCount: Array.isArray(data.accounts) ? data.accounts.length : 0,
      });

      res.json(data);
    } catch (error) {
      logger.error('Error fetching FinBot accounts', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        userId: req.user?.id,
        finbotBase: FINBOT_BASE,
      });
      
      // Try to get stale data from cache if available
      try {
        const staleCache = await redis.get(cacheKey);
        if (staleCache) {
          logger.warn('Returning stale cache data due to upstream error', {
            userId: req.user?.id,
          });
          res.json(JSON.parse(staleCache));
          return;
        }
      } catch (cacheError) {
        logger.error('Error retrieving stale cache', { error: cacheError });
      }

      res.status(500).json({
        error: 'internal_error',
        message: 'Failed to fetch financial accounts',
      });
    }
  })
);

/**
 * @swagger
 * /api/v1/finbot/transactions:
 *   get:
 *     summary: Get financial transactions
 *     tags: [FinBot]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: accountId
 *         schema:
 *           type: string
 *         description: Filter by account ID
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 100
 *         description: Maximum number of transactions to return
 *     responses:
 *       200:
 *         description: List of transactions
 */
router.get(
  '/transactions',
  setAuditContext('finbot.transactions', 'read'),
  ...withAuth('finbot.transactions', 'read'),
  asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const { accountId, limit = '100' } = req.query;
    const cacheKey = `finbot:transactions:${accountId || 'all'}:${limit}`;
    
    try {
      const cached = await redis.get(cacheKey);
      if (cached) {
        logger.debug('FinBot transactions retrieved from cache', {
          userId: req.user?.id,
          accountId: accountId as string | undefined,
        });
        res.json(JSON.parse(cached));
        return;
      }

      const queryParams = new URLSearchParams();
      if (accountId) queryParams.append('accountId', accountId as string);
      if (limit) queryParams.append('limit', limit as string);

      const response = await fetch(
        `${FINBOT_BASE}/api/v1/finbot/transactions?${queryParams.toString()}`,
        {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
          timeout: 5000,
        }
      );

      if (!response.ok) {
        logger.error('FinBot transactions fetch failed', {
          status: response.status,
          userId: req.user?.id,
        });
        res.status(502).json({
          error: 'upstream_unavailable',
          message: 'FinBot service is currently unavailable',
        });
        return;
      }

      const data = await response.json();
      await redis.setex(cacheKey, CACHE_TTL, JSON.stringify(data));

      logger.info('FinBot transactions retrieved', {
        userId: req.user?.id,
        accountId: accountId as string | undefined,
        transactionCount: Array.isArray(data.transactions) ? data.transactions.length : 0,
      });

      res.json(data);
    } catch (error) {
      logger.error('Error fetching FinBot transactions', {
        error: error instanceof Error ? error.message : String(error),
        userId: req.user?.id,
      });
      res.status(500).json({
        error: 'internal_error',
        message: 'Failed to fetch transactions',
      });
    }
  })
);

/**
 * @swagger
 * /api/v1/finbot/budgets:
 *   get:
 *     summary: Get budget information
 *     tags: [FinBot]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Budget data
 */
router.get(
  '/budgets',
  setAuditContext('finbot.budgets', 'read'),
  ...withAuth('finbot.budgets', 'read'),
  asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const cacheKey = 'finbot:budgets';
    
    try {
      const cached = await redis.get(cacheKey);
      if (cached) {
        logger.debug('FinBot budgets retrieved from cache', {
          userId: req.user?.id,
        });
        res.json(JSON.parse(cached));
        return;
      }

      const response = await fetch(`${FINBOT_BASE}/api/v1/finbot/budgets`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        timeout: 5000,
      });

      if (!response.ok) {
        logger.error('FinBot budgets fetch failed', {
          status: response.status,
          userId: req.user?.id,
        });
        res.status(502).json({
          error: 'upstream_unavailable',
          message: 'FinBot service is currently unavailable',
        });
        return;
      }

      const data = await response.json();
      await redis.setex(cacheKey, CACHE_TTL, JSON.stringify(data));

      logger.info('FinBot budgets retrieved', {
        userId: req.user?.id,
      });

      res.json(data);
    } catch (error) {
      logger.error('Error fetching FinBot budgets', {
        error: error instanceof Error ? error.message : String(error),
        userId: req.user?.id,
      });
      res.status(500).json({
        error: 'internal_error',
        message: 'Failed to fetch budgets',
      });
    }
  })
);

/**
 * @swagger
 * /api/v1/finbot/health:
 *   get:
 *     summary: Check FinBot service health
 *     tags: [FinBot]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: FinBot service is healthy
 *       502:
 *         description: FinBot service is unhealthy
 */
router.get(
  '/health',
  setAuditContext('finbot.health', 'read'),
  ...withAuth('finbot.accounts', 'read'), // Health check requires minimal read permission
  asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const response = await fetch(`${FINBOT_BASE}/api/v1/finbot/health`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        timeout: 3000, // Shorter timeout for health check
      });

      if (!response.ok) {
        logger.warn('FinBot health check failed', {
          status: response.status,
        });
        res.status(502).json({
          status: 'unhealthy',
          message: 'FinBot service is not responding',
        });
        return;
      }

      const data = await response.json();
      res.json({
        status: 'healthy',
        finbot: data,
      });
    } catch (error) {
      logger.error('FinBot health check error', {
        error: error instanceof Error ? error.message : String(error),
      });
      res.status(502).json({
        status: 'unhealthy',
        message: 'Failed to connect to FinBot service',
      });
    }
  })
);

export { router as finbotRoutes };

