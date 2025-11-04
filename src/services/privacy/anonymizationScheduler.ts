import { logger } from '@/utils/logger.js';
import {
  anonymizeUserData,
  anonymizeOldAuditLogs,
  getAnonymizationStats,
} from '@/privacy/anonymize.js';
import { db } from '@/db/index.js';
import { deletionRequests } from '@/db/schema/privacy.js';
import { eq } from 'drizzle-orm';

/**
 * GDPR Anonymization Scheduler
 * 
 * Handles scheduled anonymization jobs:
 * - Automatic anonymization of old audit logs
 * - Processing deletion requests
 * - Retention policy enforcement
 * 
 * Phase-5 Sprint 2: Task 2.2
 */

export interface AnonymizationJob {
  id: string;
  type: 'user_anonymization' | 'old_logs_anonymization' | 'deletion_request';
  userId?: string;
  retentionDays?: number;
  scheduledAt: Date;
  status: 'pending' | 'running' | 'completed' | 'failed';
  error?: string;
}

const DEFAULT_RETENTION_DAYS = parseInt(process.env.AUDIT_RETENTION_DAYS || '400', 10);
const ANONYMIZATION_INTERVAL_MS = parseInt(
  process.env.ANONYMIZATION_INTERVAL_MS || '3600000',
  10
); // Default: 1 hour

let schedulerInterval: NodeJS.Timeout | null = null;

/**
 * Process pending deletion requests
 */
export async function processDeletionRequests(): Promise<number> {
  try {
    const pendingRequests = await db.query.deletionRequests.findMany({
      where: eq(deletionRequests.processed, false),
    });

    let processedCount = 0;
    for (const request of pendingRequests) {
      try {
        await anonymizeUserData(request.userId);
        await db
          .update(deletionRequests)
          .set({
            processed: true,
            processedAt: new Date(),
          })
          .where(eq(deletionRequests.userId, request.userId));

        processedCount++;
        logger.info('Deletion request processed', {
          userId: request.userId,
        });
      } catch (error) {
        logger.error('Failed to process deletion request', {
          userId: request.userId,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return processedCount;
  } catch (error) {
    logger.error('Failed to process deletion requests', {
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

/**
 * Run scheduled anonymization of old audit logs
 */
export async function scheduleOldLogsAnonymization(
  retentionDays: number = DEFAULT_RETENTION_DAYS
): Promise<number> {
  try {
    logger.info('Starting scheduled old logs anonymization', {
      retentionDays,
    });

    const rowsAffected = await anonymizeOldAuditLogs(retentionDays);

    logger.info('Scheduled old logs anonymization completed', {
      retentionDays,
      rowsAffected,
    });

    return rowsAffected;
  } catch (error) {
    logger.error('Failed to anonymize old logs', {
      retentionDays,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

/**
 * Run anonymization job
 */
export async function runAnonymizationJob(job: AnonymizationJob): Promise<void> {
  try {
    logger.info('Running anonymization job', {
      jobId: job.id,
      type: job.type,
    });

    switch (job.type) {
      case 'user_anonymization':
        if (!job.userId) {
          throw new Error('UserId required for user anonymization');
        }
        await anonymizeUserData(job.userId);
        break;

      case 'old_logs_anonymization':
        await anonymizeOldAuditLogs(job.retentionDays || DEFAULT_RETENTION_DAYS);
        break;

      case 'deletion_request':
        await processDeletionRequests();
        break;

      default:
        throw new Error(`Unknown job type: ${job.type}`);
    }

    logger.info('Anonymization job completed', {
      jobId: job.id,
      type: job.type,
    });
  } catch (error) {
    logger.error('Anonymization job failed', {
      jobId: job.id,
      type: job.type,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

/**
 * Start the anonymization scheduler
 */
export function startAnonymizationScheduler(): void {
  if (schedulerInterval) {
    logger.warn('Anonymization scheduler already running');
    return;
  }

  logger.info('Starting anonymization scheduler', {
    intervalMs: ANONYMIZATION_INTERVAL_MS,
    retentionDays: DEFAULT_RETENTION_DAYS,
  });

  schedulerInterval = setInterval(async () => {
    try {
      // Process deletion requests
      const deletionCount = await processDeletionRequests();
      if (deletionCount > 0) {
        logger.info('Processed deletion requests', { count: deletionCount });
      }

      // Anonymize old logs
      await scheduleOldLogsAnonymization(DEFAULT_RETENTION_DAYS);

      // Log statistics
      try {
        const stats = await getAnonymizationStats();
        logger.debug('Anonymization statistics', stats);
      } catch (error) {
        // Stats may not be available, continue
        logger.debug('Could not fetch anonymization stats', { error });
      }
    } catch (error) {
      logger.error('Anonymization scheduler error', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }, ANONYMIZATION_INTERVAL_MS);
}

/**
 * Stop the anonymization scheduler
 */
export function stopAnonymizationScheduler(): void {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
    schedulerInterval = null;
    logger.info('Anonymization scheduler stopped');
  }
}

/**
 * Get scheduler status
 */
export function getSchedulerStatus(): {
  running: boolean;
  intervalMs: number;
  retentionDays: number;
} {
  return {
    running: schedulerInterval !== null,
    intervalMs: ANONYMIZATION_INTERVAL_MS,
    retentionDays: DEFAULT_RETENTION_DAYS,
  };
}

/**
 * Run immediate anonymization job (for testing or manual triggers)
 */
export async function runImmediateAnonymization(
  type: 'user' | 'old_logs' | 'deletion_requests',
  options?: {
    userId?: string;
    retentionDays?: number;
  }
): Promise<{
  success: boolean;
  rowsAffected?: number;
  processedCount?: number;
  error?: string;
}> {
  try {
    switch (type) {
      case 'user':
        if (!options?.userId) {
          throw new Error('UserId required');
        }
        await anonymizeUserData(options.userId);
        return { success: true };

      case 'old_logs':
        const rowsAffected = await anonymizeOldAuditLogs(
          options?.retentionDays || DEFAULT_RETENTION_DAYS
        );
        return { success: true, rowsAffected };

      case 'deletion_requests':
        const processedCount = await processDeletionRequests();
        return { success: true, processedCount };

      default:
        throw new Error(`Unknown anonymization type: ${type}`);
    }
  } catch (error) {
    logger.error('Immediate anonymization failed', {
      type,
      error: error instanceof Error ? error.message : String(error),
    });
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

