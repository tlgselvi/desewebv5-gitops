/**
 * Stress Test
 * 
 * Push the system to its limits to find the breaking point
 * Identifies maximum capacity and failure modes
 */

import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Rate, Trend, Counter, Gauge } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const apiDuration = new Trend('api_duration');
const concurrentUsers = new Gauge('concurrent_users');
const requestsTotal = new Counter('requests_total');
const breakingPointVUs = new Gauge('breaking_point_vus');

export const options = {
  stages: [
    // Ramp up phase
    { duration: '2m', target: 50 },    // Warm up
    { duration: '2m', target: 100 },   // Normal load
    { duration: '2m', target: 200 },   // High load
    { duration: '2m', target: 300 },   // Very high load
    { duration: '2m', target: 400 },   // Extreme load
    { duration: '2m', target: 500 },   // Breaking point test
    // Recovery phase
    { duration: '2m', target: 200 },   // Scale down
    { duration: '1m', target: 0 },     // Ramp down
  ],
  thresholds: {
    // Relaxed thresholds for stress testing
    http_req_failed: ['rate<0.10'],           // Allow up to 10% errors
    http_req_duration: ['p(95)<2000'],         // 95% under 2s
    errors: ['rate<0.10'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000/api/v1';
const AUTH_TOKEN = __ENV.AUTH_TOKEN || 'mock-token';

const params = {
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${AUTH_TOKEN}`,
  },
};

// Track VU count when errors start occurring
let errorStartVUs = 0;

export default function () {
  concurrentUsers.add(__VU);
  
  // Mixed workload
  const random = Math.random();
  
  if (random < 0.4) {
    // 40% Read operations
    readOperations();
  } else if (random < 0.7) {
    // 30% API calls
    apiCalls();
  } else {
    // 30% Write operations
    writeOperations();
  }
}

function readOperations() {
  group('Read Operations', () => {
    const endpoints = [
      '/finance/accounts',
      '/crm/contacts',
      '/inventory/products',
      '/hr/employees',
      '/iot/devices',
    ];
    
    const endpoint = endpoints[Math.floor(Math.random() * endpoints.length)];
    
    const res = http.get(`${BASE_URL}${endpoint}`, params);
    
    const success = check(res, {
      'read success': (r) => r.status === 200 || r.status === 401,
      'not server error': (r) => r.status < 500,
    });
    
    if (!success) {
      errorRate.add(1);
      if (errorStartVUs === 0) {
        errorStartVUs = __VU;
        breakingPointVUs.add(__VU);
      }
    }
    
    apiDuration.add(res.timings.duration);
    requestsTotal.add(1);
    
    sleep(0.5);
  });
}

function apiCalls() {
  group('API Calls', () => {
    // Health check
    let res = http.get(`${BASE_URL.replace('/api/v1', '')}/health`);
    check(res, { 'health ok': (r) => r.status === 200 }) || errorRate.add(1);
    apiDuration.add(res.timings.duration);
    requestsTotal.add(1);
    
    sleep(0.3);
    
    // Metrics
    res = http.get(`${BASE_URL.replace('/api/v1', '')}/metrics`);
    check(res, { 'metrics ok': (r) => r.status === 200 || r.status === 401 }) || errorRate.add(1);
    apiDuration.add(res.timings.duration);
    requestsTotal.add(1);
    
    sleep(0.3);
  });
}

function writeOperations() {
  group('Write Operations', () => {
    // IoT Telemetry (write-heavy)
    const telemetryPayload = JSON.stringify({
      deviceId: `STRESS-DEVICE-${Math.floor(Math.random() * 1000)}`,
      sensor: 'stress_test',
      value: Math.random() * 100,
      timestamp: new Date().toISOString(),
    });

    const res = http.post(`${BASE_URL}/iot/telemetry`, telemetryPayload, params);
    
    const success = check(res, {
      'write success': (r) => r.status === 201 || r.status === 200 || r.status === 401,
      'not server error': (r) => r.status < 500,
    });
    
    if (!success) {
      errorRate.add(1);
      if (errorStartVUs === 0) {
        errorStartVUs = __VU;
        breakingPointVUs.add(__VU);
      }
    }
    
    apiDuration.add(res.timings.duration);
    requestsTotal.add(1);
    
    sleep(0.5);
  });
}

export function handleSummary(data) {
  const { metrics } = data;
  
  // Calculate breaking point
  const avgDuration = metrics.http_req_duration?.values?.avg || 0;
  const p95Duration = metrics.http_req_duration?.values?.['p(95)'] || 0;
  const errorRateValue = metrics.http_req_failed?.values?.rate || 0;
  
  let breakingPoint = 'Not reached';
  if (errorRateValue > 0.05) {
    breakingPoint = `~${errorStartVUs || 'Unknown'} VUs (Error rate: ${(errorRateValue * 100).toFixed(2)}%)`;
  }
  
  const summary = {
    timestamp: new Date().toISOString(),
    breakingPoint,
    metrics: {
      totalRequests: metrics.http_reqs?.values?.count || 0,
      avgDuration: avgDuration.toFixed(2),
      p95Duration: p95Duration.toFixed(2),
      errorRate: (errorRateValue * 100).toFixed(2) + '%',
      maxVUs: metrics.vus?.values?.max || 0,
    },
    recommendation: getRecommendation(avgDuration, p95Duration, errorRateValue),
  };
  
  return {
    'tests/load/results/stress-test-summary.json': JSON.stringify(summary, null, 2),
    'stdout': generateReport(summary),
  };
}

function getRecommendation(avgDuration, p95Duration, errorRate) {
  if (errorRate > 0.1) {
    return '🔴 System is overloaded. Consider horizontal scaling or performance optimization.';
  } else if (errorRate > 0.05) {
    return '🟠 System is stressed. Monitor closely and prepare scaling plan.';
  } else if (p95Duration > 1000) {
    return '🟡 Response times are high. Consider caching or query optimization.';
  } else {
    return '🟢 System handled stress well. Current capacity is adequate.';
  }
}

function generateReport(summary) {
  return `
╔═══════════════════════════════════════════════════════════════╗
║                    STRESS TEST REPORT                          ║
╠═══════════════════════════════════════════════════════════════╣
║ Timestamp: ${summary.timestamp}                    ║
╠═══════════════════════════════════════════════════════════════╣
║ Breaking Point: ${summary.breakingPoint.padEnd(40)}║
╠═══════════════════════════════════════════════════════════════╣
║ METRICS                                                        ║
║ - Total Requests: ${String(summary.metrics.totalRequests).padEnd(38)}║
║ - Avg Duration: ${summary.metrics.avgDuration.padEnd(40)}ms ║
║ - P95 Duration: ${summary.metrics.p95Duration.padEnd(40)}ms ║
║ - Error Rate: ${summary.metrics.errorRate.padEnd(42)}║
║ - Max VUs: ${String(summary.metrics.maxVUs).padEnd(45)}║
╠═══════════════════════════════════════════════════════════════╣
║ RECOMMENDATION                                                 ║
║ ${summary.recommendation.padEnd(60)}║
╚═══════════════════════════════════════════════════════════════╝
`;
}

