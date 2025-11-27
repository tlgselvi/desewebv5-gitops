#!/usr/bin/env tsx
/**
 * API Endpoint Performance Analysis Script
 * 
 * Analyzes API endpoint response times and identifies slow endpoints.
 * Can be run against a running server or with request logs.
 */

import { writeFileSync, readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { logger } from '../../src/utils/logger.js';

interface EndpointMetric {
  method: string;
  path: string;
  count: number;
  totalTime: number;
  avgTime: number;
  minTime: number;
  maxTime: number;
  p50: number;
  p95: number;
  p99: number;
  errors: number;
  errorRate: number;
}

interface EndpointAnalysis {
  generatedAt: string;
  totalRequests: number;
  slowEndpoints: EndpointMetric[];
  errorEndpoints: EndpointMetric[];
  recommendations: string[];
}

/**
 * Analyze endpoint performance from logs or metrics
 */
function analyzeEndpoints(metrics: EndpointMetric[]): EndpointAnalysis {
  // Sort by average response time (descending)
  const sorted = [...metrics].sort((a, b) => b.avgTime - a.avgTime);
  
  // Identify slow endpoints (p95 > 500ms)
  const slowEndpoints = sorted.filter(m => m.p95 > 500);
  
  // Identify error-prone endpoints (error rate > 5%)
  const errorEndpoints = sorted.filter(m => m.errorRate > 0.05);
  
  // Generate recommendations
  const recommendations: string[] = [];
  
  slowEndpoints.forEach(endpoint => {
    if (endpoint.p95 > 1000) {
      recommendations.push(
        `🔴 CRITICAL: ${endpoint.method} ${endpoint.path} - p95: ${endpoint.p95}ms (target: <500ms)`
      );
    } else if (endpoint.p95 > 500) {
      recommendations.push(
        `🟡 WARNING: ${endpoint.method} ${endpoint.path} - p95: ${endpoint.p95}ms (target: <500ms)`
      );
    }
    
    // Specific recommendations based on patterns
    if (endpoint.path.includes('/list') || endpoint.path.includes('/search')) {
      recommendations.push(
        `  → Consider adding pagination to ${endpoint.method} ${endpoint.path}`
      );
    }
    
    if (endpoint.path.includes('/detail') || endpoint.path.includes('/:id')) {
      recommendations.push(
        `  → Consider adding caching to ${endpoint.method} ${endpoint.path}`
      );
    }
  });
  
  errorEndpoints.forEach(endpoint => {
    recommendations.push(
      `🔴 ERROR RATE: ${endpoint.method} ${endpoint.path} - ${(endpoint.errorRate * 100).toFixed(2)}% error rate`
    );
  });
  
  return {
    generatedAt: new Date().toISOString(),
    totalRequests: metrics.reduce((sum, m) => sum + m.count, 0),
    slowEndpoints,
    errorEndpoints,
    recommendations,
  };
}

/**
 * Calculate percentiles from response times
 */
function calculatePercentiles(times: number[]): { p50: number; p95: number; p99: number } {
  const sorted = [...times].sort((a, b) => a - b);
  const len = sorted.length;
  
  return {
    p50: sorted[Math.floor(len * 0.5)] || 0,
    p95: sorted[Math.floor(len * 0.95)] || 0,
    p99: sorted[Math.floor(len * 0.99)] || 0,
  };
}

/**
 * Parse metrics from Prometheus or log files
 * This is a placeholder - implement based on actual metrics source
 */
function parseMetrics(): EndpointMetric[] {
  // Placeholder implementation
  // In production, this would:
  // 1. Query Prometheus for HTTP request duration metrics
  // 2. Parse application logs for endpoint timing
  // 3. Query APM tools (if available)
  
  logger.warn('Metrics parsing not implemented. Using placeholder data.');
  
  // Example placeholder data structure
  return [
    {
      method: 'GET',
      path: '/api/dashboard',
      count: 1000,
      totalTime: 450000,
      avgTime: 450,
      minTime: 100,
      maxTime: 2000,
      p50: 400,
      p95: 800,
      p99: 1200,
      errors: 10,
      errorRate: 0.01,
    },
  ];
}

/**
 * Main execution
 */
function main() {
  logger.info('Starting endpoint performance analysis');
  
  // Parse metrics (implement based on actual source)
  const metrics = parseMetrics();
  
  if (metrics.length === 0) {
    logger.warn('No metrics found. Ensure metrics collection is enabled.');
    return;
  }
  
  // Analyze endpoints
  const analysis = analyzeEndpoints(metrics);
  
  // Save report
  const reportPath = join(process.cwd(), 'reports', 'endpoint-analysis.json');
  writeFileSync(reportPath, JSON.stringify(analysis, null, 2));
  
  // Print summary
  console.log('\n📊 API Endpoint Performance Analysis');
  console.log('='.repeat(60));
  console.log(`Total Requests: ${analysis.totalRequests}`);
  console.log(`Slow Endpoints (p95 > 500ms): ${analysis.slowEndpoints.length}`);
  console.log(`Error-Prone Endpoints (>5% error rate): ${analysis.errorEndpoints.length}`);
  
  if (analysis.slowEndpoints.length > 0) {
    console.log('\n🔴 Slow Endpoints:');
    analysis.slowEndpoints.slice(0, 10).forEach((endpoint, idx) => {
      console.log(`\n${idx + 1}. ${endpoint.method} ${endpoint.path}`);
      console.log(`   Avg: ${endpoint.avgTime}ms | p95: ${endpoint.p95}ms | p99: ${endpoint.p99}ms`);
      console.log(`   Requests: ${endpoint.count} | Errors: ${endpoint.errors}`);
    });
  }
  
  if (analysis.recommendations.length > 0) {
    console.log('\n💡 Recommendations:');
    analysis.recommendations.forEach(rec => console.log(`  ${rec}`));
  }
  
  console.log(`\n📄 Full report saved to: ${reportPath}`);
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { analyzeEndpoints, calculatePercentiles, parseMetrics };

