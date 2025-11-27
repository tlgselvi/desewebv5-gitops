#!/usr/bin/env tsx
/**
 * Cache Warming Script
 * 
 * Pre-populates Redis cache with frequently accessed data to improve API response times.
 * Should be run on application startup or periodically via cron.
 */

import { redis } from '../src/services/storage/redisClient.js';
import { logger } from '../src/utils/logger.js';
import { getPostgresClient } from '../src/db/index.js';
import { organizations } from '../src/db/schema/saas.js';
import { eq } from 'drizzle-orm';

interface CacheWarmingConfig {
  key: string;
  ttl: number; // seconds
  fetchFn: () => Promise<unknown>;
  priority: 'high' | 'medium' | 'low';
}

/**
 * Cache warming strategies for different data types
 */
const cacheWarmingStrategies: CacheWarmingConfig[] = [
  {
    key: 'cache:warm:organizations:active',
    ttl: 300, // 5 minutes
    priority: 'high',
    fetchFn: async () => {
      const db = getPostgresClient();
      const orgs = await db
        .select()
        .from(organizations)
        .where(eq(organizations.isActive, true))
        .limit(100);
      return orgs;
    },
  },
  // Add more cache warming strategies here
];

/**
 * Warm cache for a specific strategy
 */
async function warmCache(config: CacheWarmingConfig): Promise<boolean> {
  try {
    logger.info(`Warming cache: ${config.key}`, { priority: config.priority });
    
    const startTime = Date.now();
    const data = await config.fetchFn();
    const fetchTime = Date.now() - startTime;
    
    // Serialize and cache
    const serialized = JSON.stringify(data);
    await redis.setex(config.key, config.ttl, serialized);
    
    const totalTime = Date.now() - startTime;
    
    logger.info(`Cache warmed: ${config.key}`, {
      fetchTime: `${fetchTime}ms`,
      totalTime: `${totalTime}ms`,
      dataSize: `${(serialized.length / 1024).toFixed(2)}KB`,
    });
    
    return true;
  } catch (error) {
    logger.error(`Failed to warm cache: ${config.key}`, {
      error: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
}

/**
 * Warm all caches
 */
async function warmAllCaches(priority?: 'high' | 'medium' | 'low') {
  const strategies = priority
    ? cacheWarmingStrategies.filter(s => s.priority === priority)
    : cacheWarmingStrategies;
  
  // Sort by priority (high first)
  const priorityOrder = { high: 0, medium: 1, low: 2 };
  strategies.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
  
  logger.info(`Starting cache warming`, {
    total: strategies.length,
    priority: priority || 'all',
  });
  
  const results = await Promise.allSettled(
    strategies.map(config => warmCache(config))
  );
  
  const successful = results.filter(r => r.status === 'fulfilled' && r.value).length;
  const failed = results.length - successful;
  
  logger.info(`Cache warming completed`, {
    successful,
    failed,
    total: strategies.length,
  });
  
  return {
    successful,
    failed,
    total: strategies.length,
  };
}

/**
 * Warm cache for specific organization
 */
async function warmOrganizationCache(organizationId: string) {
  const db = getPostgresClient();
  
  const cacheKeys = [
    `cache:org:${organizationId}:dashboard`,
    `cache:org:${organizationId}:summary`,
  ];
  
  // Fetch and cache organization-specific data
  // This is a placeholder - implement based on actual data needs
  logger.info(`Warming organization cache`, { organizationId });
  
  // Example: Cache dashboard data
  // const dashboardData = await fetchDashboardData(organizationId);
  // await redis.setex(cacheKeys[0], 60, JSON.stringify(dashboardData));
  
  return cacheKeys;
}

// CLI execution
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const priority = args[0] as 'high' | 'medium' | 'low' | undefined;
  const orgId = args[1];
  
  if (orgId) {
    warmOrganizationCache(orgId)
      .then(() => {
        logger.info('Organization cache warming completed');
        process.exit(0);
      })
      .catch((error) => {
        logger.error('Organization cache warming failed', { error });
        process.exit(1);
      });
  } else {
    warmAllCaches(priority)
      .then((result) => {
        logger.info('Cache warming completed', result);
        process.exit(result.failed > 0 ? 1 : 0);
      })
      .catch((error) => {
        logger.error('Cache warming failed', { error });
        process.exit(1);
      });
  }
}

export { warmAllCaches, warmCache, warmOrganizationCache };

