#!/usr/bin/env tsx
/**
 * Index Analysis Script
 * 
 * Analyzes database schema and identifies missing indexes for performance optimization.
 * Generates recommendations for composite indexes, single column indexes, and partial indexes.
 */

import { readFileSync, writeFileSync } from 'fs';
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

const recommendations: IndexRecommendation[] = [];

// Analyze schema files
const schemaDir = join(process.cwd(), 'src/db/schema');
const schemaFiles = [
  'finance.ts',
  'crm.ts',
  'inventory.ts',
  'hr.ts',
  'iot.ts',
  'seo.ts',
];

function analyzeSchema(fileName: string) {
  const filePath = join(schemaDir, fileName);
  const content = readFileSync(filePath, 'utf-8');
  
  // Extract table definitions
  const tableMatches = content.matchAll(/export const (\w+) = pgTable\(['"](\w+)['"]/g);
  
  for (const match of tableMatches) {
    const tableVar = match[1];
    const tableName = match[2];
    
    // Analyze based on table name
    analyzeTable(tableName, content);
  }
}

function analyzeTable(tableName: string, content: string) {
  // Check if organizationId exists
  const hasOrgId = content.includes('organizationId');
  
  // Common patterns for missing indexes
  switch (tableName) {
    case 'contacts':
      if (hasOrgId) {
        // Composite index for assigned contacts with sorting
        if (!content.includes('contacts_org_assigned_created_idx')) {
          recommendations.push({
            table: 'contacts',
            indexName: 'contacts_org_assigned_created_idx',
            columns: ['organization_id', 'assigned_to', 'created_at'],
            type: 'composite',
            reason: 'Optimize queries for assigned contacts sorted by creation date',
            priority: 'medium',
            queryPattern: 'WHERE organization_id = ? AND assigned_to = ? ORDER BY created_at DESC',
          });
        }
        // Index for createdAt sorting
        if (!content.includes('contacts_created_at_idx')) {
          recommendations.push({
            table: 'contacts',
            indexName: 'contacts_created_at_idx',
            columns: ['created_at'],
            type: 'single',
            reason: 'Optimize sorting by creation date',
            priority: 'low',
          });
        }
      }
      break;
      
    case 'deals':
      if (hasOrgId) {
        // Composite index for pipeline queries
        if (!content.includes('deals_org_stage_status_idx')) {
          recommendations.push({
            table: 'deals',
            indexName: 'deals_org_stage_status_idx',
            columns: ['organization_id', 'stage_id', 'status'],
            type: 'composite',
            reason: 'Optimize pipeline queries filtering by stage and status',
            priority: 'high',
            queryPattern: 'WHERE organization_id = ? AND stage_id = ? AND status = ?',
          });
        }
        // Index for createdAt sorting
        if (!content.includes('deals_created_at_idx')) {
          recommendations.push({
            table: 'deals',
            indexName: 'deals_created_at_idx',
            columns: ['created_at'],
            type: 'single',
            reason: 'Optimize sorting by creation date',
            priority: 'medium',
          });
        }
        // Partial index for open deals
        if (!content.includes('deals_open_idx')) {
          recommendations.push({
            table: 'deals',
            indexName: 'deals_open_idx',
            columns: ['organization_id', 'stage_id', 'expected_close_date'],
            type: 'partial',
            reason: 'Optimize queries for open deals only',
            priority: 'medium',
            queryPattern: 'WHERE organization_id = ? AND status = \'open\' ORDER BY expected_close_date',
          });
        }
      }
      break;
      
    case 'activities':
      if (hasOrgId) {
        // Composite index for pending activities
        if (!content.includes('activities_org_status_due_idx')) {
          recommendations.push({
            table: 'activities',
            indexName: 'activities_org_status_due_idx',
            columns: ['organization_id', 'status', 'due_date'],
            type: 'composite',
            reason: 'Optimize queries for pending activities sorted by due date',
            priority: 'high',
            queryPattern: 'WHERE organization_id = ? AND status = \'pending\' ORDER BY due_date ASC',
          });
        }
        // Composite index for assigned activities
        if (!content.includes('activities_org_assigned_status_idx')) {
          recommendations.push({
            table: 'activities',
            indexName: 'activities_org_assigned_status_idx',
            columns: ['organization_id', 'assigned_to', 'status'],
            type: 'composite',
            reason: 'Optimize queries for assigned activities by status',
            priority: 'medium',
            queryPattern: 'WHERE organization_id = ? AND assigned_to = ? AND status = ?',
          });
        }
      }
      break;
      
    case 'products':
      if (hasOrgId) {
        // Composite index for product type filtering
        if (!content.includes('products_org_type_active_idx')) {
          recommendations.push({
            table: 'products',
            indexName: 'products_org_type_active_idx',
            columns: ['organization_id', 'type', 'is_active'],
            type: 'composite',
            reason: 'Optimize queries filtering products by type and active status',
            priority: 'medium',
            queryPattern: 'WHERE organization_id = ? AND type = ? AND is_active = true',
          });
        }
        // Index for createdAt sorting
        if (!content.includes('products_created_at_idx')) {
          recommendations.push({
            table: 'products',
            indexName: 'products_created_at_idx',
            columns: ['created_at'],
            type: 'single',
            reason: 'Optimize sorting by creation date',
            priority: 'low',
          });
        }
      }
      break;
      
    case 'stock_movements':
      if (hasOrgId) {
        // Composite index for movement type filtering
        if (!content.includes('stock_movements_org_type_date_idx')) {
          recommendations.push({
            table: 'stock_movements',
            indexName: 'stock_movements_org_type_date_idx',
            columns: ['organization_id', 'type', 'created_at'],
            type: 'composite',
            reason: 'Optimize queries filtering movements by type and date',
            priority: 'medium',
            queryPattern: 'WHERE organization_id = ? AND type = ? ORDER BY created_at DESC',
          });
        }
      }
      break;
      
    case 'payrolls':
      if (hasOrgId) {
        // Composite index for payroll status and period
        if (!content.includes('payrolls_org_status_period_idx')) {
          recommendations.push({
            table: 'payrolls',
            indexName: 'payrolls_org_status_period_idx',
            columns: ['organization_id', 'status', 'period'],
            type: 'composite',
            reason: 'Optimize queries filtering payrolls by status and period',
            priority: 'high',
            queryPattern: 'WHERE organization_id = ? AND status = ? AND period = ?',
          });
        }
      }
      break;
      
    case 'employees':
      if (hasOrgId) {
        // Composite index for active employees by department
        if (!content.includes('employees_org_status_dept_idx')) {
          recommendations.push({
            table: 'employees',
            indexName: 'employees_org_status_dept_idx',
            columns: ['organization_id', 'status', 'department_id'],
            type: 'composite',
            reason: 'Optimize queries for active employees by department',
            priority: 'medium',
            queryPattern: 'WHERE organization_id = ? AND status = \'active\' AND department_id = ?',
          });
        }
      }
      break;
      
    case 'devices':
      if (hasOrgId) {
        // Index for status filtering
        if (!content.includes('devices_status_idx')) {
          recommendations.push({
            table: 'devices',
            indexName: 'devices_status_idx',
            columns: ['status'],
            type: 'single',
            reason: 'Optimize queries filtering devices by status',
            priority: 'medium',
            queryPattern: 'WHERE organization_id = ? AND status = ?',
          });
        }
        // Composite index for active devices
        if (!content.includes('devices_org_active_idx')) {
          recommendations.push({
            table: 'devices',
            indexName: 'devices_org_active_idx',
            columns: ['organization_id', 'is_active'],
            type: 'composite',
            reason: 'Optimize queries for active devices',
            priority: 'medium',
            queryPattern: 'WHERE organization_id = ? AND is_active = true',
          });
        }
      }
      break;
      
    case 'device_alerts':
      if (hasOrgId) {
        // Composite index for unresolved alerts by severity
        if (!content.includes('device_alerts_org_unresolved_severity_idx')) {
          recommendations.push({
            table: 'device_alerts',
            indexName: 'device_alerts_org_unresolved_severity_idx',
            columns: ['organization_id', 'is_resolved', 'severity', 'created_at'],
            type: 'composite',
            reason: 'Optimize queries for unresolved alerts sorted by severity and date',
            priority: 'high',
            queryPattern: 'WHERE organization_id = ? AND is_resolved = false ORDER BY severity, created_at DESC',
          });
        }
      }
      break;
      
    case 'invoices':
      if (hasOrgId) {
        // Partial index for non-cancelled invoices
        if (!content.includes('invoices_active_idx')) {
          recommendations.push({
            table: 'invoices',
            indexName: 'invoices_active_idx',
            columns: ['organization_id', 'invoice_date', 'status'],
            type: 'partial',
            reason: 'Optimize queries excluding cancelled invoices',
            priority: 'low',
            queryPattern: 'WHERE organization_id = ? AND status != \'cancelled\' ORDER BY invoice_date DESC',
          });
        }
      }
      break;
  }
}

// Analyze all schema files
for (const file of schemaFiles) {
  try {
    analyzeSchema(file);
  } catch (error) {
    console.error(`Error analyzing ${file}:`, error);
  }
}

// Generate report
const report = {
  generatedAt: new Date().toISOString(),
  totalRecommendations: recommendations.length,
  byPriority: {
    high: recommendations.filter(r => r.priority === 'high').length,
    medium: recommendations.filter(r => r.priority === 'medium').length,
    low: recommendations.filter(r => r.priority === 'low').length,
  },
  byType: {
    composite: recommendations.filter(r => r.type === 'composite').length,
    single: recommendations.filter(r => r.type === 'single').length,
    partial: recommendations.filter(r => r.type === 'partial').length,
  },
  recommendations: recommendations.sort((a, b) => {
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  }),
};

// Save report
const reportPath = join(process.cwd(), 'reports', 'index-analysis.json');
writeFileSync(reportPath, JSON.stringify(report, null, 2));

// Print summary
console.log('📊 Index Analysis Report');
console.log('='.repeat(50));
console.log(`Total Recommendations: ${report.totalRecommendations}`);
console.log(`High Priority: ${report.byPriority.high}`);
console.log(`Medium Priority: ${report.byPriority.medium}`);
console.log(`Low Priority: ${report.byPriority.low}`);
console.log(`\nBy Type:`);
console.log(`  Composite: ${report.byType.composite}`);
console.log(`  Single: ${report.byType.single}`);
console.log(`  Partial: ${report.byType.partial}`);
console.log(`\nReport saved to: ${reportPath}`);

// Print high priority recommendations
const highPriority = recommendations.filter(r => r.priority === 'high');
if (highPriority.length > 0) {
  console.log(`\n🔴 High Priority Recommendations:`);
  highPriority.forEach((rec, idx) => {
    console.log(`\n${idx + 1}. ${rec.table}.${rec.indexName}`);
    console.log(`   Columns: ${rec.columns.join(', ')}`);
    console.log(`   Reason: ${rec.reason}`);
    if (rec.queryPattern) {
      console.log(`   Query: ${rec.queryPattern}`);
    }
  });
}

