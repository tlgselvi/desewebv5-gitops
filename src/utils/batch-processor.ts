/**
 * Batch Processing Utilities
 * 
 * Efficiently process items in batches with:
 * - Configurable batch size
 * - Parallel/concurrent processing
 * - Error handling and retry
 * - Progress tracking
 * - Rate limiting
 * 
 * Based on proven patterns from:
 * - AWS SDK batch operations
 * - Google Cloud batch processing
 * - Database bulk operations
 */

import { logger } from './logger.js';

export interface BatchProcessorOptions<T> {
  /** Maximum number of items per batch */
  batchSize?: number;
  /** Maximum number of concurrent batches */
  concurrency?: number;
  /** Delay between batches (ms) */
  delayBetweenBatches?: number;
  /** Whether to continue on error */
  continueOnError?: boolean;
  /** Custom error handler */
  onError?: (error: Error, item: T, index: number) => void;
  /** Progress callback */
  onProgress?: (processed: number, total: number) => void;
  /** Completion callback */
  onComplete?: (results: BatchResult<T>[]) => void;
}

export interface BatchResult<T> {
  item: T;
  index: number;
  success: boolean;
  result?: unknown;
  error?: Error;
}

/**
 * Process items in batches
 */
export async function processBatch<T, R = unknown>(
  items: T[],
  processor: (batch: T[]) => Promise<R[]>,
  options: BatchProcessorOptions<T> = {}
): Promise<BatchResult<T>[]> {
  const {
    batchSize = 10,
    concurrency = 3,
    delayBetweenBatches = 0,
    continueOnError = true,
    onError,
    onProgress,
    onComplete,
  } = options;

  const results: BatchResult<T>[] = [];
  const batches: T[][] = [];

  // Split items into batches
  for (let i = 0; i < items.length; i += batchSize) {
    batches.push(items.slice(i, i + batchSize));
  }

  logger.info('[BatchProcessor] Starting batch processing', {
    totalItems: items.length,
    batchSize,
    totalBatches: batches.length,
    concurrency,
  });

  // Process batches with concurrency control
  let processedCount = 0;
  const activeBatches: Promise<void>[] = [];

  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    const batchIndex = i;

    // Wait if we've reached concurrency limit
    if (activeBatches.length >= concurrency) {
      await Promise.race(activeBatches);
      // Remove completed promises
      for (let j = activeBatches.length - 1; j >= 0; j--) {
        try {
          await Promise.race([activeBatches[j], Promise.resolve()]);
          activeBatches.splice(j, 1);
        } catch {
          // Promise already resolved/rejected
        }
      }
    }

    // Process batch
    const batchPromise = (async () => {
      try {
        const batchResults = await processor(batch);
        
        // Map results to BatchResult format
        batch.forEach((item, itemIndex) => {
          const globalIndex = batchIndex * batchSize + itemIndex;
          const result: BatchResult<T> = {
            item,
            index: globalIndex,
            success: true,
            result: batchResults[itemIndex],
          };
          results.push(result);
        });

        processedCount += batch.length;
        
        if (onProgress) {
          onProgress(processedCount, items.length);
        }

        // Delay between batches if configured
        if (delayBetweenBatches > 0 && batchIndex < batches.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, delayBetweenBatches));
        }
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        
        // Handle each item in the failed batch
        batch.forEach((item, itemIndex) => {
          const globalIndex = batchIndex * batchSize + itemIndex;
          const result: BatchResult<T> = {
            item,
            index: globalIndex,
            success: false,
            error: err,
          };
          results.push(result);

          if (onError) {
            onError(err, item, globalIndex);
          }
        });

        processedCount += batch.length;
        
        if (onProgress) {
          onProgress(processedCount, items.length);
        }

        if (!continueOnError) {
          throw err;
        }

        logger.error('[BatchProcessor] Batch processing error', {
          batchIndex,
          error: err.message,
          continueOnError,
        });
      }
    })();

    activeBatches.push(batchPromise);
  }

  // Wait for all remaining batches
  await Promise.allSettled(activeBatches);

  logger.info('[BatchProcessor] Batch processing completed', {
    totalItems: items.length,
    processed: processedCount,
    successful: results.filter((r) => r.success).length,
    failed: results.filter((r) => !r.success).length,
  });

  if (onComplete) {
    onComplete(results);
  }

  return results;
}

/**
 * Process items one by one with rate limiting
 */
export async function processSequential<T, R = unknown>(
  items: T[],
  processor: (item: T, index: number) => Promise<R>,
  options: {
    delayBetweenItems?: number;
    continueOnError?: boolean;
    onError?: (error: Error, item: T, index: number) => void;
    onProgress?: (processed: number, total: number) => void;
  } = {}
): Promise<BatchResult<T>[]> {
  const {
    delayBetweenItems = 0,
    continueOnError = true,
    onError,
    onProgress,
  } = options;

  const results: BatchResult<T>[] = [];

  logger.info('[BatchProcessor] Starting sequential processing', {
    totalItems: items.length,
    delayBetweenItems,
  });

  for (let i = 0; i < items.length; i++) {
    const item = items[i];

    try {
      const result = await processor(item, i);
      results.push({
        item,
        index: i,
        success: true,
        result,
      });

      if (onProgress) {
        onProgress(i + 1, items.length);
      }
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      results.push({
        item,
        index: i,
        success: false,
        error: err,
      });

      if (onError) {
        onError(err, item, i);
      }

      if (!continueOnError) {
        throw err;
      }

      logger.error('[BatchProcessor] Item processing error', {
        index: i,
        error: err.message,
        continueOnError,
      });
    }

    // Delay between items if configured
    if (delayBetweenItems > 0 && i < items.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, delayBetweenItems));
    }
  }

  logger.info('[BatchProcessor] Sequential processing completed', {
    totalItems: items.length,
    successful: results.filter((r) => r.success).length,
    failed: results.filter((r) => !r.success).length,
  });

  return results;
}

/**
 * Chunk array into batches
 */
export function chunk<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

/**
 * Process items in parallel with concurrency limit
 */
export async function processParallel<T, R = unknown>(
  items: T[],
  processor: (item: T, index: number) => Promise<R>,
  options: {
    concurrency?: number;
    continueOnError?: boolean;
    onError?: (error: Error, item: T, index: number) => void;
    onProgress?: (processed: number, total: number) => void;
  } = {}
): Promise<BatchResult<T>[]> {
  const {
    concurrency = 5,
    continueOnError = true,
    onError,
    onProgress,
  } = options;

  const results: BatchResult<T>[] = [];
  const active: Promise<void>[] = [];
  let processedCount = 0;

  logger.info('[BatchProcessor] Starting parallel processing', {
    totalItems: items.length,
    concurrency,
  });

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const index = i;

    // Wait if we've reached concurrency limit
    if (active.length >= concurrency) {
      await Promise.race(active);
      // Remove completed promises
      for (let j = active.length - 1; j >= 0; j--) {
        try {
          await Promise.race([active[j], Promise.resolve()]);
          active.splice(j, 1);
        } catch {
          // Promise already resolved/rejected
        }
      }
    }

    // Process item
    const promise = (async () => {
      try {
        const result = await processor(item, index);
        results.push({
          item,
          index,
          success: true,
          result,
        });
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        results.push({
          item,
          index,
          success: false,
          error: err,
        });

        if (onError) {
          onError(err, item, index);
        }

        if (!continueOnError) {
          throw err;
        }
      } finally {
        processedCount++;
        if (onProgress) {
          onProgress(processedCount, items.length);
        }
      }
    })();

    active.push(promise);
  }

  // Wait for all remaining items
  await Promise.allSettled(active);

  logger.info('[BatchProcessor] Parallel processing completed', {
    totalItems: items.length,
    successful: results.filter((r) => r.success).length,
    failed: results.filter((r) => !r.success).length,
  });

  return results;
}

