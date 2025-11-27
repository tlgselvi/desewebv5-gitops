#!/usr/bin/env tsx
/**
 * Performance Optimization - Query Analysis Script
 * 
 * Analyzes database queries for performance issues:
 * - Slow queries
 * - N+1 query problems
 * - Missing indexes
 * - Query plan analysis
 */

import { getPostgresClient } from '../../src/db/index.js';
import { logger } from '../../src/utils/logger.js';

interface QueryStats {
  query: string;
  calls: number;
  totalTime: number;
  meanTime: number;
  minTime: number;
  maxTime: number;
}

interface IndexInfo {
  tableName: string;
  indexName: string;
  indexDef: string;
  isUsed: boolean;
}

/**
 * Enable PostgreSQL slow query logging
 */
async function enableSlowQueryLogging(thresholdMs: number = 1000): Promise<void> {
  const client = getPostgresClient();
  
  try {
    // Enable pg_stat_statements extension if not exists
    await client.unsafe(`CREATE EXTENSION IF NOT EXISTS pg_stat_statements`);
    
    // Set log_min_duration_statement (requires superuser or postgres user)
    await client.unsafe(`SET log_min_duration_statement = ${thresholdMs}`);
    
    logger.info('Slow query logging enabled', { thresholdMs });
  } catch (error) {
    logger.warn('Could not enable slow query logging (may require superuser)', { error });
  }
}

/**
 * Get slow queries from pg_stat_statements
 */
async function getSlowQueries(limit: number = 20): Promise<QueryStats[]> {
  const client = getPostgresClient();
  
  try {
    const result = await client.unsafe<QueryStats[]>(
      `SELECT 
        query,
        calls,
        total_exec_time as "totalTime",
        mean_exec_time as "meanTime",
        min_exec_time as "minTime",
        max_exec_time as "maxTime"
      FROM pg_stat_statements
      WHERE mean_exec_time > 100
      ORDER BY mean_exec_time DESC
      LIMIT ${limit}`
    );
    
    return result;
  } catch (error) {
    logger.error('Error fetching slow queries', { error });
    return [];
  }
}

/**
 * Analyze query plan using EXPLAIN ANALYZE
 */
async function analyzeQueryPlan(query: string): Promise<string> {
  const client = getPostgresClient();
  
  try {
    // Sanitize query for EXPLAIN
    const sanitizedQuery = query.replace(/;$/, '');
    const result = await client.unsafe<Array<{ 'QUERY PLAN': unknown }>>(
      `EXPLAIN (ANALYZE, BUFFERS, VERBOSE, FORMAT JSON) ${sanitizedQuery}`
    );
    
    return JSON.stringify(result, null, 2);
  } catch (error) {
    logger.error('Error analyzing query plan', { error, query });
    return `Error: ${error instanceof Error ? error.message : String(error)}`;
  }
}

/**
 * Get unused indexes
 */
async function getUnusedIndexes(): Promise<IndexInfo[]> {
  const client = getPostgresClient();
  
  try {
    const result = await client.unsafe<IndexInfo[]>(
      `SELECT 
        schemaname || '.' || tablename as "tableName",
        indexname as "indexName",
        indexdef as "indexDef",
        COALESCE(idx_scan, 0) = 0 as "isUsed"
      FROM pg_indexes
      LEFT JOIN pg_stat_user_indexes ON pg_indexes.indexname = pg_stat_user_indexes.indexname
      WHERE schemaname = 'public'
        AND COALESCE(idx_scan, 0) = 0
        AND indexname NOT LIKE '%_pkey'
      ORDER BY tablename, indexname`
    );
    
    return result;
  } catch (error) {
    logger.error('Error fetching unused indexes', { error });
    return [];
  }
}

/**
 * Get missing indexes (tables without indexes on foreign keys)
 */
async function getMissingIndexes(): Promise<Array<{ table: string; column: string; type: string }>> {
  const client = getPostgresClient();
  
  try {
    const result = await client.unsafe<Array<{ table: string; column: string; type: string }>>(
      `SELECT 
        t.relname as table,
        a.attname as column,
        CASE 
          WHEN a.attnotnull THEN 'NOT NULL'
          ELSE 'NULLABLE'
        END as type
      FROM pg_class t
      JOIN pg_attribute a ON a.attrelid = t.oid
      JOIN pg_constraint c ON c.conrelid = t.oid AND a.attnum = ANY(c.conkey)
      LEFT JOIN pg_index i ON i.indrelid = t.oid AND a.attnum = ANY(i.indkey)
      WHERE t.relkind = 'r'
        AND t.relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
        AND c.contype = 'f'
        AND i.indexrelid IS NULL
        AND a.attnum > 0
      ORDER BY t.relname, a.attname`
    );
    
    return result;
  } catch (error) {
    logger.error('Error fetching missing indexes', { error });
    return [];
  }
}

/**
 * Detect N+1 query patterns in codebase
 * This is a static analysis - checks for loops with database queries inside
 */
async function detectNPlusOnePatterns(): Promise<Array<{ file: string; line: number; pattern: string }>> {
  // This would require parsing TypeScript files
  // For now, return empty array - can be enhanced with AST parsing
  logger.info('N+1 pattern detection requires static code analysis');
  return [];
}

/**
 * Main analysis function
 */
async function runQueryAnalysis(): Promise<void> {
  logger.info('Starting query analysis...');
  
  // 1. Enable slow query logging
  await enableSlowQueryLogging(1000);
  
  // 2. Get slow queries
  logger.info('Fetching slow queries...');
  const slowQueries = await getSlowQueries(20);
  
  if (slowQueries.length > 0) {
    logger.warn(`Found ${slowQueries.length} slow queries:`, slowQueries);
    
    // Analyze top 5 slow queries
    for (const query of slowQueries.slice(0, 5)) {
      logger.info(`Analyzing query plan for: ${query.query.substring(0, 100)}...`);
      const plan = await analyzeQueryPlan(query.query);
      logger.info('Query plan:', { plan });
    }
  } else {
    logger.info('No slow queries found');
  }
  
  // 3. Get unused indexes
  logger.info('Checking for unused indexes...');
  const unusedIndexes = await getUnusedIndexes();
  
  if (unusedIndexes.length > 0) {
    logger.warn(`Found ${unusedIndexes.length} unused indexes:`, unusedIndexes);
  } else {
    logger.info('No unused indexes found');
  }
  
  // 4. Get missing indexes
  logger.info('Checking for missing indexes...');
  const missingIndexes = await getMissingIndexes();
  
  if (missingIndexes.length > 0) {
    logger.warn(`Found ${missingIndexes.length} foreign keys without indexes:`, missingIndexes);
  } else {
    logger.info('All foreign keys have indexes');
  }
  
  // 5. Generate report
  const report = {
    timestamp: new Date().toISOString(),
    slowQueries: slowQueries.length,
    unusedIndexes: unusedIndexes.length,
    missingIndexes: missingIndexes.length,
    details: {
      slowQueries: slowQueries.slice(0, 10),
      unusedIndexes: unusedIndexes.slice(0, 10),
      missingIndexes,
    },
  };
  
  logger.info('Query analysis complete', report);
  
  // Write report to file
  const fs = await import('fs/promises');
  await fs.writeFile(
    'reports/query-analysis.json',
    JSON.stringify(report, null, 2)
  );
  
  logger.info('Report saved to reports/query-analysis.json');
}

// Run if executed directly
if (import.meta.url.endsWith(process.argv[1]) || process.argv[1]?.includes('query-analysis')) {
  runQueryAnalysis()
    .then(() => {
      logger.info('Query analysis completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('Query analysis failed', { error });
      process.exit(1);
    });
}

export { runQueryAnalysis, getSlowQueries, getUnusedIndexes, getMissingIndexes, analyzeQueryPlan };

