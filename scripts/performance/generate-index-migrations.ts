#!/usr/bin/env tsx
/**
 * Generate Index Migration Script
 * 
 * Generates Drizzle migration files for recommended indexes from index-analysis.json
 */

import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

interface IndexRecommendation {
  table: string;
  indexName: string;
  columns: string[];
  type: 'composite' | 'single' | 'partial';
  reason: string;
  priority: 'high' | 'medium' | 'low';
  queryPattern?: string;
}

interface IndexAnalysisReport {
  generatedAt: string;
  totalRecommendations: number;
  recommendations: IndexRecommendation[];
}

function generateIndexSQL(recommendation: IndexRecommendation): string {
  const { table, indexName, columns, type } = recommendation;
  
  const columnsStr = columns.map(col => `"${col}"`).join(', ');
  
  if (type === 'partial') {
    // Generate partial index based on table
    let whereClause = '';
    switch (table) {
      case 'deals':
        whereClause = "WHERE status = 'open'";
        break;
      case 'invoices':
        whereClause = "WHERE status != 'cancelled'";
        break;
      case 'activities':
        whereClause = "WHERE status = 'pending'";
        break;
      case 'device_alerts':
        whereClause = "WHERE is_resolved = false";
        break;
      default:
        whereClause = '';
    }
    
    return `CREATE INDEX IF NOT EXISTS "${indexName}" ON "${table}" (${columnsStr}) ${whereClause};`;
  }
  
  return `CREATE INDEX IF NOT EXISTS "${indexName}" ON "${table}" (${columnsStr});`;
}

function generateMigrationFile(recommendations: IndexRecommendation[], priority: 'high' | 'medium' | 'low' | 'all' = 'all') {
  const filtered = priority === 'all' 
    ? recommendations 
    : recommendations.filter(r => r.priority === priority);
  
  if (filtered.length === 0) {
    console.log(`No ${priority} priority recommendations found.`);
    return;
  }
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  const priorityStr = priority === 'all' ? 'all' : priority;
  const migrationName = `add_indexes_${priorityStr}_${timestamp}`;
  
  const sqlStatements = filtered.map(rec => {
    const sql = generateIndexSQL(rec);
    return `-- ${rec.reason}\n${sql}`;
  }).join('\n\n');
  
  const migrationSQL = `-- Migration: Add ${priorityStr} priority indexes\n-- Generated: ${new Date().toISOString()}\n-- Total indexes: ${filtered.length}\n\n${sqlStatements}\n`;
  
  // Save to drizzle migrations directory
  const migrationsDir = join(process.cwd(), 'drizzle');
  mkdirSync(migrationsDir, { recursive: true });
  
  const migrationFile = join(migrationsDir, `${migrationName}.sql`);
  writeFileSync(migrationFile, migrationSQL);
  
  console.log(`✅ Generated migration: ${migrationFile}`);
  console.log(`   Indexes: ${filtered.length}`);
  
  return migrationFile;
}

// Main execution
const reportPath = join(process.cwd(), 'reports', 'index-analysis.json');

try {
  const reportContent = readFileSync(reportPath, 'utf-8');
  const report: IndexAnalysisReport = JSON.parse(reportContent);
  
  console.log('📝 Generating Index Migrations');
  console.log('='.repeat(50));
  console.log(`Total recommendations: ${report.totalRecommendations}\n`);
  
  // Generate migrations by priority
  if (report.recommendations.filter(r => r.priority === 'high').length > 0) {
    console.log('🔴 Generating HIGH priority migrations...');
    generateMigrationFile(report.recommendations, 'high');
    console.log('');
  }
  
  if (report.recommendations.filter(r => r.priority === 'medium').length > 0) {
    console.log('🟡 Generating MEDIUM priority migrations...');
    generateMigrationFile(report.recommendations, 'medium');
    console.log('');
  }
  
  if (report.recommendations.filter(r => r.priority === 'low').length > 0) {
    console.log('🟢 Generating LOW priority migrations...');
    generateMigrationFile(report.recommendations, 'low');
    console.log('');
  }
  
  console.log('✅ Migration generation complete!');
  console.log('\nNext steps:');
  console.log('1. Review the generated SQL files in drizzle/ directory');
  console.log('2. Test migrations on a development database');
  console.log('3. Apply migrations: pnpm db:migrate');
  
} catch (error) {
  if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
    console.error('❌ Index analysis report not found. Run "pnpm perf:index-analysis" first.');
  } else {
    console.error('❌ Error generating migrations:', error);
  }
  process.exit(1);
}

