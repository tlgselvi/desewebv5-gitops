import { usageService } from '@/modules/saas/usage.service.js';
import { logger } from '@/utils/logger.js';

/**
 * Usage Aggregation Job
 * Aggregates daily usage metrics into monthly metrics
 * Should be run hourly or daily
 */
export async function aggregateUsageMetricsJob(organizationId?: string): Promise<void> {
  try {
    logger.info('[UsageAggregationJob] Starting usage metrics aggregation', {
      organizationId: organizationId || 'all',
    });

    await usageService.aggregateUsageMetrics(organizationId);

    logger.info('[UsageAggregationJob] Usage metrics aggregation completed', {
      organizationId: organizationId || 'all',
    });
  } catch (error) {
    logger.error('[UsageAggregationJob] Failed to aggregate usage metrics', {
      error: error instanceof Error ? error.message : String(error),
      organizationId,
    });
    throw error;
  }
}

/**
 * Run aggregation for all organizations
 */
if (require.main === module) {
  aggregateUsageMetricsJob()
    .then(() => {
      logger.info('[UsageAggregationJob] Job completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('[UsageAggregationJob] Job failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      process.exit(1);
    });
}

