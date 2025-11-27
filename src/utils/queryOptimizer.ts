/**
 * Query Optimizer Utilities
 * Helper functions for optimizing database queries
 */

import { db } from '@/db/index.js';
import { recordDatabaseQuery } from '@/middleware/prometheus.js';
import { logger } from '@/utils/logger.js';

/**
 * Execute a database query with performance tracking
 */
export async function executeWithMetrics<T>(
  queryFn: () => Promise<T>,
  table: string,
  operation: string
): Promise<T> {
  const start = Date.now();
  try {
    const result = await queryFn();
    const duration = (Date.now() - start) / 1000;
    recordDatabaseQuery(table, operation, duration, 'success');
    return result;
  } catch (error) {
    const duration = (Date.now() - start) / 1000;
    recordDatabaseQuery(table, operation, duration, 'error');
    logger.error('Database query failed', { table, operation, error });
    throw error;
  }
}

/**
 * Batch process items to avoid N+1 queries
 */
export async function batchProcess<T, R>(
  items: T[],
  batchSize: number,
  processor: (batch: T[]) => Promise<R[]>
): Promise<R[]> {
  const results: R[] = [];
  
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchResults = await processor(batch);
    results.push(...batchResults);
  }
  
  return results;
}

/**
 * Pagination helper with cursor-based pagination support
 */
export interface PaginationOptions {
  limit?: number;
  offset?: number;
  cursor?: string;
  cursorField?: string;
}

export interface PaginatedResult<T> {
  items: T[];
  total?: number;
  hasMore: boolean;
  nextCursor?: string;
}

/**
 * Execute paginated query
 */
export async function paginateQuery<T>(
  queryFn: (limit: number, offset: number) => Promise<T[]>,
  options: PaginationOptions = {}
): Promise<PaginatedResult<T>> {
  const limit = options.limit || 20;
  const offset = options.offset || 0;
  
  // Fetch one extra item to check if there are more
  const items = await queryFn(limit + 1, offset);
  const hasMore = items.length > limit;
  
  return {
    items: items.slice(0, limit),
    hasMore,
    nextCursor: hasMore && options.cursorField 
      ? (items[limit - 1] as any)[options.cursorField] 
      : undefined,
  };
}

