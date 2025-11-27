/**
 * Query Optimization Utilities
 * 
 * Provides utilities for optimizing database queries:
 * - Eager loading helpers
 * - Batch operations
 * - Pagination helpers
 */

import { db } from '@/db/index.js';
import { sql, and, eq, desc, asc, inArray } from 'drizzle-orm';
import type { PgTable } from 'drizzle-orm/pg-core';
import type { SQL } from 'drizzle-orm';

/**
 * Pagination parameters
 */
export interface PaginationParams {
  page: number;
  pageSize: number;
}

/**
 * Paginated result
 */
export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

/**
 * Calculate pagination offset
 */
export function getPaginationOffset(page: number, pageSize: number): number {
  return (page - 1) * pageSize;
}

/**
 * Calculate total pages
 */
export function getTotalPages(total: number, pageSize: number): number {
  return Math.ceil(total / pageSize);
}

/**
 * Build pagination metadata
 */
export function buildPaginationMeta(
  total: number,
  page: number,
  pageSize: number
): PaginatedResult<never>['pagination'] {
  const totalPages = getTotalPages(total, pageSize);
  return {
    page,
    pageSize,
    total,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1,
  };
}

/**
 * Execute batch inserts in chunks to avoid memory issues
 */
export async function batchInsert<T>(
  table: PgTable,
  values: T[],
  chunkSize: number = 100
): Promise<void> {
  for (let i = 0; i < values.length; i += chunkSize) {
    const chunk = values.slice(i, i + chunkSize);
    await db.insert(table).values(chunk as any);
  }
}

/**
 * Execute batch updates
 */
export async function batchUpdate<T extends { id: string }>(
  table: PgTable,
  updates: Array<{ id: string; data: Partial<T> }>
): Promise<void> {
  // For batch updates, we need to use a transaction
  await db.transaction(async (tx) => {
    for (const update of updates) {
      await tx
        .update(table)
        .set(update.data as any)
        .where(eq((table as any).id, update.id));
    }
  });
}

/**
 * Fetch related records in batch (solves N+1 problem)
 */
export async function batchFetch<T extends { id: string }>(
  table: PgTable,
  ids: string[],
  whereCondition?: SQL
): Promise<T[]> {
  if (ids.length === 0) return [];
  
  const conditions = [inArray((table as any).id, ids)];
  if (whereCondition) {
    conditions.push(whereCondition);
  }
  
  return await db
    .select()
    .from(table)
    .where(and(...conditions)) as T[];
}

/**
 * Cursor-based pagination (more efficient than offset-based for large datasets)
 */
export interface CursorPaginationParams {
  cursor?: string;
  limit: number;
  orderBy: 'asc' | 'desc';
}

export interface CursorPaginatedResult<T> {
  data: T[];
  nextCursor?: string;
  hasMore: boolean;
}

/**
 * Build cursor-based pagination query
 */
export function buildCursorQuery(
  cursor?: string,
  orderBy: 'asc' | 'desc' = 'desc'
) {
  if (!cursor) {
    return {
      orderFn: orderBy === 'desc' ? desc : asc,
      whereCondition: undefined,
    };
  }
  
  // For cursor-based pagination, we need to know the cursor field
  // This is a simplified version - actual implementation depends on the table structure
  return {
    orderFn: orderBy === 'desc' ? desc : asc,
    whereCondition: undefined, // Will be set by caller based on cursor field
  };
}

/**
 * Optimize query by using EXISTS instead of IN for large lists
 */
export function useExistsInsteadOfIn(
  subquery: SQL,
  threshold: number = 100
): boolean {
  // If the subquery result is expected to be large, EXISTS is more efficient
  // This is a heuristic - actual decision should be based on query plan analysis
  return threshold > 100;
}

/**
 * Build optimized WHERE clause with organization filter
 */
export function withOrganizationFilter(
  organizationId: string,
  additionalConditions: SQL[] = []
): SQL {
  return and(
    eq((sql.raw('organization_id') as any), organizationId),
    ...additionalConditions
  );
}

/**
 * Prefetch related data to avoid N+1 queries
 */
export async function prefetchRelations<T extends { id: string }>(
  records: T[],
  relationLoader: (ids: string[]) => Promise<any[]>,
  relationKey: keyof T
): Promise<Map<string, any>> {
  const ids = records.map(r => r[relationKey] as string).filter(Boolean);
  const relations = await relationLoader(ids);
  
  const relationMap = new Map<string, any>();
  for (const relation of relations) {
    relationMap.set(relation.id, relation);
  }
  
  return relationMap;
}

