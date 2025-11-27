#!/usr/bin/env tsx
/**
 * Connection Leak Detection Script
 * 
 * Monitors database connection pool for potential leaks.
 * Detects connections that are held open for too long or not properly closed.
 */

import { getPostgresClient } from '../../src/db/index.js';
import { logger } from '../../src/utils/logger.js';
import { writeFileSync } from 'fs';
import { join } from 'path';

interface ConnectionInfo {
  pid: number;
  usename: string;
  applicationName: string;
  state: string;
  query: string;
  stateChange: Date;
  duration: number; // seconds
  waitEventType: string | null;
  waitEvent: string | null;
}

interface LeakDetectionReport {
  generatedAt: string;
  totalConnections: number;
  activeConnections: number;
  idleConnections: number;
  longRunningQueries: ConnectionInfo[];
  idleInTransaction: ConnectionInfo[];
  potentialLeaks: ConnectionInfo[];
  recommendations: string[];
}

/**
 * Get current connection statistics
 */
async function getConnectionStats(): Promise<{
  total: number;
  active: number;
  idle: number;
  idleInTransaction: number;
}> {
  const client = getPostgresClient();
  
  const result = await client`
    SELECT 
      count(*) as total,
      count(*) FILTER (WHERE state = 'active') as active,
      count(*) FILTER (WHERE state = 'idle') as idle,
      count(*) FILTER (WHERE state = 'idle in transaction') as idle_in_transaction
    FROM pg_stat_activity
    WHERE datname = current_database()
      AND pid != pg_backend_pid()
  `;
  
  return {
    total: Number(result[0]?.total || 0),
    active: Number(result[0]?.active || 0),
    idle: Number(result[0]?.idle || 0),
    idleInTransaction: Number(result[0]?.idle_in_transaction || 0),
  };
}

/**
 * Get detailed connection information
 */
async function getConnectionDetails(): Promise<ConnectionInfo[]> {
  const client = getPostgresClient();
  
  const result = await client`
    SELECT 
      pid,
      usename,
      application_name as "applicationName",
      state,
      LEFT(query, 100) as query,
      state_change,
      EXTRACT(EPOCH FROM (NOW() - state_change))::int as duration,
      wait_event_type as "waitEventType",
      wait_event as "waitEvent"
    FROM pg_stat_activity
    WHERE datname = current_database()
      AND pid != pg_backend_pid()
    ORDER BY state_change ASC
  `;
  
  return result.map((row: any) => ({
    pid: row.pid,
    usename: row.usename,
    applicationName: row.application_name || 'unknown',
    state: row.state,
    query: row.query || '',
    stateChange: new Date(row.state_change),
    duration: Number(row.duration || 0),
    waitEventType: row.wait_event_type,
    waitEvent: row.wait_event,
  }));
}

/**
 * Detect potential connection leaks
 */
function detectLeaks(connections: ConnectionInfo[]): {
  longRunning: ConnectionInfo[];
  idleInTransaction: ConnectionInfo[];
  potentialLeaks: ConnectionInfo[];
} {
  const longRunningThreshold = 300; // 5 minutes
  const idleInTransactionThreshold = 60; // 1 minute
  
  const longRunning = connections.filter(
    conn => conn.state === 'active' && conn.duration > longRunningThreshold
  );
  
  const idleInTransaction = connections.filter(
    conn => conn.state === 'idle in transaction' && conn.duration > idleInTransactionThreshold
  );
  
  // Potential leaks: connections that are idle in transaction for too long
  // or active connections running for an unusually long time
  const potentialLeaks = connections.filter(
    conn =>
      (conn.state === 'idle in transaction' && conn.duration > 300) ||
      (conn.state === 'active' && conn.duration > 600)
  );
  
  return {
    longRunning,
    idleInTransaction,
    potentialLeaks,
  };
}

/**
 * Generate recommendations
 */
function generateRecommendations(
  stats: { total: number; active: number; idle: number; idleInTransaction: number },
  leaks: { longRunning: ConnectionInfo[]; idleInTransaction: ConnectionInfo[]; potentialLeaks: ConnectionInfo[] }
): string[] {
  const recommendations: string[] = [];
  
  if (stats.total > 15) {
    recommendations.push(
      `⚠️ High connection count: ${stats.total} connections (max: 20). Consider optimizing connection usage.`
    );
  }
  
  if (stats.idleInTransaction > 3) {
    recommendations.push(
      `🔴 ${stats.idleInTransaction} connections idle in transaction. This indicates potential transaction leaks.`
    );
  }
  
  if (leaks.longRunning.length > 0) {
    recommendations.push(
      `🟡 ${leaks.longRunning.length} long-running queries detected. Review query performance.`
    );
  }
  
  if (leaks.potentialLeaks.length > 0) {
    recommendations.push(
      `🔴 ${leaks.potentialLeaks.length} potential connection leaks detected. Review application code for unclosed connections.`
    );
  }
  
  if (stats.idle > 10) {
    recommendations.push(
      `🟡 ${stats.idle} idle connections. Consider reducing idle_timeout or connection pool size.`
    );
  }
  
  return recommendations;
}

/**
 * Main detection function
 */
async function detectConnectionLeaks(): Promise<LeakDetectionReport> {
  logger.info('Starting connection leak detection');
  
  const stats = await getConnectionStats();
  const connections = await getConnectionDetails();
  const leaks = detectLeaks(connections);
  const recommendations = generateRecommendations(stats, leaks);
  
  const report: LeakDetectionReport = {
    generatedAt: new Date().toISOString(),
    totalConnections: stats.total,
    activeConnections: stats.active,
    idleConnections: stats.idle,
    longRunningQueries: leaks.longRunning,
    idleInTransaction: leaks.idleInTransaction,
    potentialLeaks: leaks.potentialLeaks,
    recommendations,
  };
  
  return report;
}

/**
 * Kill specific connection (use with caution)
 */
async function killConnection(pid: number): Promise<boolean> {
  try {
    const client = getPostgresClient();
    await client`SELECT pg_terminate_backend(${pid})`;
    logger.info(`Terminated connection: ${pid}`);
    return true;
  } catch (error) {
    logger.error(`Failed to terminate connection: ${pid}`, { error });
    return false;
  }
}

// CLI execution
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const action = args[0];
  
  if (action === 'kill' && args[1]) {
    const pid = parseInt(args[1], 10);
    killConnection(pid)
      .then(success => {
        process.exit(success ? 0 : 1);
      })
      .catch(error => {
        logger.error('Error killing connection', { error });
        process.exit(1);
      });
  } else {
    detectConnectionLeaks()
      .then(report => {
        // Save report
        const reportPath = join(process.cwd(), 'reports', 'connection-leak-detection.json');
        writeFileSync(reportPath, JSON.stringify(report, null, 2));
        
        // Print summary
        console.log('\n🔍 Connection Leak Detection Report');
        console.log('='.repeat(60));
        console.log(`Total Connections: ${report.totalConnections}`);
        console.log(`Active: ${report.activeConnections}`);
        console.log(`Idle: ${report.idleConnections}`);
        console.log(`Idle in Transaction: ${report.idleInTransaction.length}`);
        console.log(`Long-Running Queries: ${report.longRunningQueries.length}`);
        console.log(`Potential Leaks: ${report.potentialLeaks.length}`);
        
        if (report.potentialLeaks.length > 0) {
          console.log('\n🔴 Potential Leaks:');
          report.potentialLeaks.forEach((leak, idx) => {
            console.log(`\n${idx + 1}. PID: ${leak.pid} | State: ${leak.state}`);
            console.log(`   Duration: ${leak.duration}s | App: ${leak.applicationName}`);
            console.log(`   Query: ${leak.query.substring(0, 80)}...`);
          });
        }
        
        if (report.recommendations.length > 0) {
          console.log('\n💡 Recommendations:');
          report.recommendations.forEach(rec => console.log(`  ${rec}`));
        }
        
        console.log(`\n📄 Full report saved to: ${reportPath}`);
        
        process.exit(report.potentialLeaks.length > 0 ? 1 : 0);
      })
      .catch(error => {
        logger.error('Connection leak detection failed', { error });
        process.exit(1);
      });
  }
}

export { detectConnectionLeaks, killConnection, getConnectionStats };

