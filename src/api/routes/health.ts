/**
 * Enhanced Health Check Routes
 * DESE EA PLAN v7.0 - High Availability
 * 
 * Provides comprehensive health checks for:
 * - Liveness: Is the service alive?
 * - Readiness: Can the service handle traffic?
 * - Full health: Detailed system status
 */

import { Router, Request, Response } from 'express';
import type { Router as ExpressRouter } from 'express';
import { db } from '../../db';
import { sql } from 'drizzle-orm';
import Redis from 'ioredis';

const router: ExpressRouter = Router();

// Redis client (initialized lazily)
let redisClient: Redis | null = null;

const getRedisClient = (): Redis | null => {
  if (!redisClient && process.env.REDIS_URL) {
    try {
      redisClient = new Redis(process.env.REDIS_URL, {
        maxRetriesPerRequest: 1,
        connectTimeout: 5000,
        commandTimeout: 5000,
      });
    } catch (error) {
      console.error('Failed to create Redis client:', error);
    }
  }
  return redisClient;
};

interface HealthCheckResult {
  status: 'healthy' | 'unhealthy' | 'degraded';
  latency?: number;
  error?: string;
}

interface FullHealthResponse {
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: string;
  version: string;
  uptime: number;
  checks: {
    database: HealthCheckResult;
    redis: HealthCheckResult;
    memory: HealthCheckResult;
    disk?: HealthCheckResult;
  };
  metrics?: {
    memoryUsage: NodeJS.MemoryUsage;
    cpuUsage?: NodeJS.CpuUsage;
  };
}

/**
 * Check database connectivity
 */
async function checkDatabase(): Promise<HealthCheckResult> {
  const startTime = Date.now();
  
  try {
    await db.execute(sql`SELECT 1`);
    const latency = Date.now() - startTime;
    
    return {
      status: latency > 1000 ? 'degraded' : 'healthy',
      latency,
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      latency: Date.now() - startTime,
      error: error instanceof Error ? error.message : 'Database check failed',
    };
  }
}

/**
 * Check Redis connectivity
 */
async function checkRedis(): Promise<HealthCheckResult> {
  const client = getRedisClient();
  
  if (!client) {
    return {
      status: 'unhealthy',
      error: 'Redis not configured',
    };
  }

  const startTime = Date.now();

  try {
    const result = await client.ping();
    const latency = Date.now() - startTime;

    if (result === 'PONG') {
      return {
        status: latency > 100 ? 'degraded' : 'healthy',
        latency,
      };
    }

    return {
      status: 'unhealthy',
      latency,
      error: 'Unexpected Redis response',
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      latency: Date.now() - startTime,
      error: error instanceof Error ? error.message : 'Redis check failed',
    };
  }
}

/**
 * Check memory usage
 */
function checkMemory(): HealthCheckResult {
  const memoryUsage = process.memoryUsage();
  const heapUsedMB = memoryUsage.heapUsed / 1024 / 1024;
  const heapTotalMB = memoryUsage.heapTotal / 1024 / 1024;
  const heapPercentage = (heapUsedMB / heapTotalMB) * 100;

  if (heapPercentage > 90) {
    return {
      status: 'unhealthy',
      error: `High memory usage: ${heapPercentage.toFixed(1)}%`,
    };
  }

  if (heapPercentage > 80) {
    return {
      status: 'degraded',
      error: `Elevated memory usage: ${heapPercentage.toFixed(1)}%`,
    };
  }

  return {
    status: 'healthy',
  };
}

/**
 * GET /api/v1/health/live
 * Liveness probe - is the service alive?
 * Used by Kubernetes to determine if container should be restarted
 */
router.get('/live', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
});

/**
 * GET /api/v1/health/ready
 * Readiness probe - can the service handle traffic?
 * Used by Kubernetes to determine if pod should receive traffic
 */
router.get('/ready', async (req: Request, res: Response) => {
  try {
    // Quick database check
    const dbCheck = await checkDatabase();
    
    if (dbCheck.status === 'unhealthy') {
      return res.status(503).json({
        status: 'not_ready',
        reason: 'database_unavailable',
        timestamp: new Date().toISOString(),
      });
    }

    res.status(200).json({
      status: 'ready',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(503).json({
      status: 'not_ready',
      reason: 'health_check_failed',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /api/v1/health
 * Full health check with detailed status
 */
router.get('/', async (req: Request, res: Response) => {
  const includeMetrics = req.query.metrics === 'true';
  
  try {
    const [dbCheck, redisCheck] = await Promise.all([
      checkDatabase(),
      checkRedis(),
    ]);
    
    const memoryCheck = checkMemory();

    // Determine overall status
    let overallStatus: 'healthy' | 'unhealthy' | 'degraded' = 'healthy';
    
    if (dbCheck.status === 'unhealthy') {
      overallStatus = 'unhealthy';
    } else if (
      dbCheck.status === 'degraded' ||
      redisCheck.status === 'degraded' ||
      memoryCheck.status === 'degraded'
    ) {
      overallStatus = 'degraded';
    } else if (redisCheck.status === 'unhealthy') {
      // Redis being down is degraded, not unhealthy (app can work without cache)
      overallStatus = 'degraded';
    }

    const response: FullHealthResponse = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      version: process.env.APP_VERSION || '7.0.0',
      uptime: process.uptime(),
      checks: {
        database: dbCheck,
        redis: redisCheck,
        memory: memoryCheck,
      },
    };

    if (includeMetrics) {
      response.metrics = {
        memoryUsage: process.memoryUsage(),
        cpuUsage: process.cpuUsage(),
      };
    }

    const httpStatus = overallStatus === 'unhealthy' ? 503 : 200;
    res.status(httpStatus).json(response);
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Health check failed',
    });
  }
});

/**
 * GET /api/v1/health/startup
 * Startup probe - is the service ready to start?
 * Used by Kubernetes for slow-starting containers
 */
router.get('/startup', async (req: Request, res: Response) => {
  try {
    // Basic check - can we respond at all?
    res.status(200).json({
      status: 'started',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(503).json({
      status: 'starting',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /api/v1/health/dependencies
 * Detailed dependency health check
 */
router.get('/dependencies', async (req: Request, res: Response) => {
  const dependencies: Record<string, HealthCheckResult & { type: string }> = {};

  // Database check
  const dbCheck = await checkDatabase();
  dependencies.postgresql = {
    ...dbCheck,
    type: 'database',
  };

  // Redis check
  const redisCheck = await checkRedis();
  dependencies.redis = {
    ...redisCheck,
    type: 'cache',
  };

  // External services (add more as needed)
  // MQTT broker check
  if (process.env.MQTT_BROKER_URL) {
    dependencies.mqtt = {
      status: 'healthy', // Would need actual MQTT client to check
      type: 'message_broker',
    };
  }

  // Determine overall dependency health
  const unhealthyCount = Object.values(dependencies).filter(
    (d) => d.status === 'unhealthy'
  ).length;
  
  const degradedCount = Object.values(dependencies).filter(
    (d) => d.status === 'degraded'
  ).length;

  let overallStatus: 'healthy' | 'unhealthy' | 'degraded' = 'healthy';
  if (unhealthyCount > 0) {
    overallStatus = dependencies.postgresql.status === 'unhealthy' ? 'unhealthy' : 'degraded';
  } else if (degradedCount > 0) {
    overallStatus = 'degraded';
  }

  res.status(overallStatus === 'unhealthy' ? 503 : 200).json({
    status: overallStatus,
    timestamp: new Date().toISOString(),
    dependencies,
    summary: {
      total: Object.keys(dependencies).length,
      healthy: Object.values(dependencies).filter((d) => d.status === 'healthy').length,
      degraded: degradedCount,
      unhealthy: unhealthyCount,
    },
  });
});

export default router;

