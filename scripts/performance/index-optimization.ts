#!/usr/bin/env tsx
/**
 * Index Optimization Script
 * 
 * Analyzes and suggests index optimizations:
 * - Missing composite indexes
 * - Unused indexes
 * - Partial indexes for filtered queries
 * - Index recommendations based on query patterns
 */

import { getPostgresClient } from '../../src/db/index.js';
import { logger } from '../../src/utils/logger.js';

interface IndexRecommendation {
  table: string;
  columns: string[];
  type: 'composite' | 'partial' | 'missing';
  reason: string;
  priority: 'high' | 'medium' | 'low';
  query?: string;
}

interface CurrentIndex {
  tableName: string;
  indexName: string;
  indexDef: string;
  size: string;
  scans: number;
  writes: number;
}

/**
 * Get all current indexes with usage statistics
 */
async function getCurrentIndexes(): Promise<CurrentIndex[]> {
  const client = getPostgresClient();
  
  try {
    const result = await client.unsafe<CurrentIndex[]>(
      `SELECT 
        schemaname || '.' || tablename as "tableName",
        indexname as "indexName",
        indexdef as "indexDef",
        pg_size_pretty(pg_relation_size(indexrelid)) as size,
        COALESCE(idx_scan, 0) as scans,
        COALESCE(idx_tup_write, 0) as writes
      FROM pg_indexes
      LEFT JOIN pg_stat_user_indexes 
        ON pg_indexes.indexname = pg_stat_user_indexes.indexname
        AND pg_indexes.schemaname = pg_stat_user_indexes.schemaname
      WHERE pg_indexes.schemaname = 'public'
      ORDER BY tablename, indexname`
    );
    
    return result;
  } catch (error) {
    logger.error('Error fetching current indexes', { error });
    return [];
  }
}

/**
 * Analyze query patterns to suggest composite indexes
 */
async function analyzeQueryPatterns(): Promise<IndexRecommendation[]> {
  const client = getPostgresClient();
  const recommendations: IndexRecommendation[] = [];
  
  try {
    // Get common query patterns from pg_stat_statements
    const queryPatterns = await client.unsafe<Array<{
      query: string;
      calls: number;
      meanTime: number;
    }>>(
      `SELECT 
        query,
        calls,
        mean_exec_time as "meanTime"
      FROM pg_stat_statements
      WHERE schemaname = 'public'
        AND calls > 10
        AND mean_exec_time > 50
      ORDER BY calls DESC, mean_exec_time DESC
      LIMIT 50`
    );
    
    // Analyze WHERE clauses with multiple conditions
    for (const pattern of queryPatterns) {
      const query = pattern.query.toLowerCase();
      
      // Pattern: WHERE org_id = ? AND status = ?
      if (query.includes('organization_id') && query.includes('status')) {
        const tableMatch = query.match(/from\s+(\w+)/);
        if (tableMatch) {
          const table = tableMatch[1];
          recommendations.push({
            table,
            columns: ['organization_id', 'status'],
            type: 'composite',
            reason: `Frequently queried together (${pattern.calls} calls, ${pattern.meanTime.toFixed(2)}ms avg)`,
            priority: pattern.calls > 100 ? 'high' : 'medium',
            query: pattern.query.substring(0, 200),
          });
        }
      }
      
      // Pattern: WHERE org_id = ? AND date >= ? ORDER BY date
      if (query.includes('organization_id') && query.includes('date') && query.includes('order by')) {
        const tableMatch = query.match(/from\s+(\w+)/);
        if (tableMatch) {
          const table = tableMatch[1];
          recommendations.push({
            table,
            columns: ['organization_id', 'date'],
            type: 'composite',
            reason: `Range queries with ordering (${pattern.calls} calls)`,
            priority: pattern.calls > 50 ? 'high' : 'medium',
            query: pattern.query.substring(0, 200),
          });
        }
      }
      
      // Pattern: WHERE status = 'active' (partial index candidate)
      if (query.includes("status = '") && query.includes('organization_id')) {
        const statusMatch = query.match(/status\s*=\s*'(\w+)'/);
        const tableMatch = query.match(/from\s+(\w+)/);
        if (statusMatch && tableMatch) {
          const table = tableMatch[1];
          const status = statusMatch[1];
          recommendations.push({
            table,
            columns: ['organization_id', 'status'],
            type: 'partial',
            reason: `Partial index for status='${status}' (${pattern.calls} calls)`,
            priority: pattern.calls > 100 ? 'high' : 'low',
            query: pattern.query.substring(0, 200),
          });
        }
      }
    }
  } catch (error) {
    logger.warn('Could not analyze query patterns (pg_stat_statements may not be enabled)', { error });
  }
  
  return recommendations;
}

/**
 * Check for missing indexes on foreign keys
 */
async function getMissingForeignKeyIndexes(): Promise<IndexRecommendation[]> {
  const client = getPostgresClient();
  const recommendations: IndexRecommendation[] = [];
  
  try {
    const result = await client.unsafe<Array<{
      table: string;
      column: string;
      constraint: string;
    }>>(
      `SELECT 
        t.relname as table,
        a.attname as column,
        c.conname as constraint
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
    
    for (const row of result) {
      recommendations.push({
        table: row.table,
        columns: [row.column],
        type: 'missing',
        reason: `Foreign key constraint '${row.constraint}' without index`,
        priority: 'high',
      });
    }
  } catch (error) {
    logger.error('Error checking foreign key indexes', { error });
  }
  
  return recommendations;
}

/**
 * Generate migration SQL for recommended indexes
 */
function generateIndexMigration(recommendations: IndexRecommendation[]): string {
  const highPriority = recommendations.filter(r => r.priority === 'high');
  const mediumPriority = recommendations.filter(r => r.priority === 'medium');
  
  let sql = `-- Index Optimization Migration
-- Generated: ${new Date().toISOString()}
-- High Priority Indexes (${highPriority.length})
-- Medium Priority Indexes (${mediumPriority.length})

`;

  // High priority indexes
  for (const rec of highPriority) {
    const indexName = `${rec.table}_${rec.columns.join('_')}_idx`;
    const columns = rec.columns.join(', ');
    
    if (rec.type === 'partial') {
      // Extract condition from reason or use default
      const condition = rec.reason.includes("status='") 
        ? rec.reason.match(/status='(\w+)'/)?.[1] 
        : null;
      
      if (condition) {
        sql += `-- ${rec.reason}\n`;
        sql += `CREATE INDEX IF NOT EXISTS ${indexName} ON ${rec.table} (${columns}) WHERE status = '${condition}';\n\n`;
      } else {
        sql += `-- ${rec.reason}\n`;
        sql += `CREATE INDEX IF NOT EXISTS ${indexName} ON ${rec.table} (${columns});\n\n`;
      }
    } else {
      sql += `-- ${rec.reason}\n`;
      sql += `CREATE INDEX IF NOT EXISTS ${indexName} ON ${rec.table} (${columns});\n\n`;
    }
  }
  
  // Medium priority indexes
  if (mediumPriority.length > 0) {
    sql += `-- Medium Priority Indexes\n\n`;
    for (const rec of mediumPriority) {
      const indexName = `${rec.table}_${rec.columns.join('_')}_idx`;
      const columns = rec.columns.join(', ');
      
      sql += `-- ${rec.reason}\n`;
      sql += `-- CREATE INDEX IF NOT EXISTS ${indexName} ON ${rec.table} (${columns});\n\n`;
    }
  }
  
  return sql;
}

/**
 * Suggest indexes to drop (unused or duplicate)
 */
async function getUnusedIndexes(): Promise<Array<{ table: string; index: string; reason: string }>> {
  const client = getPostgresClient();
  const suggestions: Array<{ table: string; index: string; reason: string }> = [];
  
  try {
    const result = await client.unsafe<Array<{
      table: string;
      index: string;
      scans: number;
      size: string;
    }>>(
      `SELECT 
        schemaname || '.' || tablename as table,
        indexname as index,
        COALESCE(idx_scan, 0) as scans,
        pg_size_pretty(pg_relation_size(indexrelid)) as size
      FROM pg_indexes
      LEFT JOIN pg_stat_user_indexes 
        ON pg_indexes.indexname = pg_stat_user_indexes.indexname
      WHERE pg_indexes.schemaname = 'public'
        AND COALESCE(idx_scan, 0) = 0
        AND indexname NOT LIKE '%_pkey'
        AND indexname NOT LIKE '%_unique%'
      ORDER BY pg_relation_size(indexrelid) DESC`
    );
    
    for (const row of result) {
      suggestions.push({
        table: row.table,
        index: row.index,
        reason: `Unused index (0 scans, ${row.size} size)`,
      });
    }
  } catch (error) {
    logger.error('Error checking unused indexes', { error });
  }
  
  return suggestions;
}

/**
 * Main optimization function
 */
async function runIndexOptimization(): Promise<void> {
  logger.info('Starting index optimization analysis...');
  
  // 1. Get current indexes
  logger.info('Fetching current indexes...');
  const currentIndexes = await getCurrentIndexes();
  logger.info(`Found ${currentIndexes.length} indexes`);
  
  // 2. Analyze query patterns
  logger.info('Analyzing query patterns...');
  const queryRecommendations = await analyzeQueryPatterns();
  logger.info(`Found ${queryRecommendations.length} query-based recommendations`);
  
  // 3. Check missing FK indexes
  logger.info('Checking foreign key indexes...');
  const fkRecommendations = await getMissingForeignKeyIndexes();
  logger.info(`Found ${fkRecommendations.length} missing FK indexes`);
  
  // 4. Get unused indexes
  logger.info('Checking for unused indexes...');
  const unusedIndexes = await getUnusedIndexes();
  logger.info(`Found ${unusedIndexes.length} unused indexes`);
  
  // 5. Combine recommendations
  const allRecommendations = [...queryRecommendations, ...fkRecommendations];
  
  // Remove duplicates
  const uniqueRecommendations = allRecommendations.filter((rec, index, self) =>
    index === self.findIndex(r => 
      r.table === rec.table && 
      r.columns.join(',') === rec.columns.join(',')
    )
  );
  
  // 6. Generate report
  const report = {
    timestamp: new Date().toISOString(),
    currentIndexes: currentIndexes.length,
    recommendations: {
      total: uniqueRecommendations.length,
      high: uniqueRecommendations.filter(r => r.priority === 'high').length,
      medium: uniqueRecommendations.filter(r => r.priority === 'medium').length,
      low: uniqueRecommendations.filter(r => r.priority === 'low').length,
    },
    unusedIndexes: unusedIndexes.length,
    details: {
      recommendations: uniqueRecommendations,
      unusedIndexes: unusedIndexes.slice(0, 20), // Top 20 by size
      currentIndexes: currentIndexes.slice(0, 50), // Sample
    },
  };
  
  logger.info('Index optimization analysis complete', {
    recommendations: report.recommendations,
    unusedIndexes: report.unusedIndexes,
  });
  
  // 7. Generate migration SQL
  const migrationSQL = generateIndexMigration(uniqueRecommendations);
  
  // 8. Write reports
  const fs = await import('fs/promises');
  await fs.mkdir('reports', { recursive: true });
  
  await fs.writeFile(
    'reports/index-optimization.json',
    JSON.stringify(report, null, 2)
  );
  
  await fs.writeFile(
    'reports/index-optimization-migration.sql',
    migrationSQL
  );
  
  logger.info('Reports saved:');
  logger.info('  - reports/index-optimization.json');
  logger.info('  - reports/index-optimization-migration.sql');
  
  // Print summary
  console.log('\n📊 Index Optimization Summary:');
  console.log(`   Current indexes: ${currentIndexes.length}`);
  console.log(`   Recommended indexes: ${uniqueRecommendations.length} (${report.recommendations.high} high, ${report.recommendations.medium} medium)`);
  console.log(`   Unused indexes: ${unusedIndexes.length}`);
  console.log(`\n   Review migration SQL: reports/index-optimization-migration.sql`);
}

// Run if executed directly
if (import.meta.url.endsWith(process.argv[1]) || process.argv[1]?.includes('index-optimization')) {
  runIndexOptimization()
    .then(() => {
      logger.info('Index optimization completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('Index optimization failed', { error });
      process.exit(1);
    });
}

export { runIndexOptimization, getCurrentIndexes, analyzeQueryPatterns, getMissingForeignKeyIndexes };

