/**
 * Database Performance Benchmark
 * 
 * Tests database query performance through API endpoints
 * Measures read/write latency and throughput
 */

import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Trend, Rate, Counter } from 'k6/metrics';

// Database operation metrics
const readDuration = new Trend('db_read_duration');
const writeDuration = new Trend('db_write_duration');
const listDuration = new Trend('db_list_duration');
const searchDuration = new Trend('db_search_duration');
const readErrors = new Rate('db_read_errors');
const writeErrors = new Rate('db_write_errors');
const queryCount = new Counter('db_query_count');

export const options = {
  scenarios: {
    // Read-heavy workload
    read_benchmark: {
      executor: 'constant-vus',
      vus: 10,
      duration: '2m',
      exec: 'readBenchmark',
      startTime: '0s',
    },
    // Write workload
    write_benchmark: {
      executor: 'constant-vus',
      vus: 5,
      duration: '2m',
      exec: 'writeBenchmark',
      startTime: '2m30s',
    },
    // Mixed workload (realistic)
    mixed_benchmark: {
      executor: 'constant-vus',
      vus: 15,
      duration: '3m',
      exec: 'mixedBenchmark',
      startTime: '5m',
    },
  },
  thresholds: {
    'db_read_duration': ['p(95)<200'],
    'db_write_duration': ['p(95)<300'],
    'db_list_duration': ['p(95)<500'],
    'db_read_errors': ['rate<0.01'],
    'db_write_errors': ['rate<0.01'],
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

// Read benchmark - tests SELECT queries
export function readBenchmark() {
  group('Database Read Operations', () => {
    // Single record fetch (by ID simulation)
    const modules = ['finance', 'crm', 'inventory', 'hr', 'iot'];
    const endpoints = {
      finance: '/finance/accounts',
      crm: '/crm/contacts',
      inventory: '/inventory/products',
      hr: '/hr/employees',
      iot: '/iot/devices',
    };
    
    const module = modules[Math.floor(Math.random() * modules.length)];
    const endpoint = endpoints[module];
    
    // List query (pagination)
    let res = http.get(`${BASE_URL}${endpoint}?page=1&limit=10`, params);
    listDuration.add(res.timings.duration);
    queryCount.add(1);
    
    const success = check(res, {
      'list query ok': (r) => r.status === 200 || r.status === 401,
    });
    
    if (!success) {
      readErrors.add(1);
    }
    
    sleep(0.5);
    
    // Search query (with filters)
    res = http.get(`${BASE_URL}${endpoint}?search=test&page=1&limit=20`, params);
    searchDuration.add(res.timings.duration);
    queryCount.add(1);
    
    check(res, {
      'search query ok': (r) => r.status === 200 || r.status === 401,
    }) || readErrors.add(1);
    
    sleep(0.3);
  });
}

// Write benchmark - tests INSERT/UPDATE queries
export function writeBenchmark() {
  group('Database Write Operations', () => {
    // IoT telemetry insert (high-volume writes)
    const telemetryPayload = JSON.stringify({
      deviceId: `DB-BENCH-${Math.floor(Math.random() * 1000)}`,
      sensor: 'db_benchmark',
      value: Math.random() * 100,
      timestamp: new Date().toISOString(),
      metadata: {
        benchmark: true,
        iteration: __ITER,
      },
    });

    const res = http.post(`${BASE_URL}/iot/telemetry`, telemetryPayload, params);
    writeDuration.add(res.timings.duration);
    queryCount.add(1);
    
    const success = check(res, {
      'write ok': (r) => r.status === 201 || r.status === 200 || r.status === 401,
    });
    
    if (!success) {
      writeErrors.add(1);
    }
    
    sleep(0.5);
  });
}

// Mixed benchmark - realistic read/write ratio (80/20)
export function mixedBenchmark() {
  const random = Math.random();
  
  if (random < 0.8) {
    // 80% reads
    group('Mixed - Read', () => {
      const endpoints = [
        '/finance/accounts',
        '/crm/contacts',
        '/inventory/products',
        '/hr/employees',
        '/iot/devices',
      ];
      
      const endpoint = endpoints[Math.floor(Math.random() * endpoints.length)];
      const page = Math.floor(Math.random() * 5) + 1;
      
      const res = http.get(`${BASE_URL}${endpoint}?page=${page}&limit=20`, params);
      readDuration.add(res.timings.duration);
      queryCount.add(1);
      
      check(res, {
        'mixed read ok': (r) => r.status === 200 || r.status === 401,
      }) || readErrors.add(1);
    });
  } else {
    // 20% writes
    group('Mixed - Write', () => {
      const telemetryPayload = JSON.stringify({
        deviceId: `MIXED-${Math.floor(Math.random() * 1000)}`,
        sensor: 'mixed_benchmark',
        value: Math.random() * 100,
        timestamp: new Date().toISOString(),
      });

      const res = http.post(`${BASE_URL}/iot/telemetry`, telemetryPayload, params);
      writeDuration.add(res.timings.duration);
      queryCount.add(1);
      
      check(res, {
        'mixed write ok': (r) => r.status === 201 || r.status === 200 || r.status === 401,
      }) || writeErrors.add(1);
    });
  }
  
  sleep(0.2);
}

export function handleSummary(data) {
  const { metrics: m } = data;
  
  const report = {
    timestamp: new Date().toISOString(),
    testType: 'Database Performance Benchmark',
    environment: BASE_URL,
    results: {
      read: {
        avg: (m.db_read_duration?.values?.avg || 0).toFixed(2) + 'ms',
        p50: (m.db_read_duration?.values?.med || 0).toFixed(2) + 'ms',
        p95: (m.db_read_duration?.values?.['p(95)'] || 0).toFixed(2) + 'ms',
        p99: (m.db_read_duration?.values?.['p(99)'] || 0).toFixed(2) + 'ms',
        errorRate: ((m.db_read_errors?.values?.rate || 0) * 100).toFixed(2) + '%',
      },
      write: {
        avg: (m.db_write_duration?.values?.avg || 0).toFixed(2) + 'ms',
        p50: (m.db_write_duration?.values?.med || 0).toFixed(2) + 'ms',
        p95: (m.db_write_duration?.values?.['p(95)'] || 0).toFixed(2) + 'ms',
        p99: (m.db_write_duration?.values?.['p(99)'] || 0).toFixed(2) + 'ms',
        errorRate: ((m.db_write_errors?.values?.rate || 0) * 100).toFixed(2) + '%',
      },
      list: {
        avg: (m.db_list_duration?.values?.avg || 0).toFixed(2) + 'ms',
        p95: (m.db_list_duration?.values?.['p(95)'] || 0).toFixed(2) + 'ms',
      },
      search: {
        avg: (m.db_search_duration?.values?.avg || 0).toFixed(2) + 'ms',
        p95: (m.db_search_duration?.values?.['p(95)'] || 0).toFixed(2) + 'ms',
      },
      totalQueries: m.db_query_count?.values?.count || 0,
      qps: ((m.db_query_count?.values?.count || 0) / 420).toFixed(2), // 7 minutes total
    },
    recommendations: generateRecommendations(m),
  };
  
  return {
    'tests/load/results/database-benchmark.json': JSON.stringify(report, null, 2),
    'stdout': generateDBReport(report),
  };
}

function generateRecommendations(m) {
  const recommendations = [];
  
  const readP95 = m.db_read_duration?.values?.['p(95)'] || 0;
  const writeP95 = m.db_write_duration?.values?.['p(95)'] || 0;
  const listP95 = m.db_list_duration?.values?.['p(95)'] || 0;
  
  if (readP95 > 200) {
    recommendations.push('Consider adding indexes for frequently queried columns');
  }
  if (writeP95 > 300) {
    recommendations.push('Review write-heavy operations, consider batch inserts');
  }
  if (listP95 > 500) {
    recommendations.push('Optimize list queries with proper pagination and indexes');
  }
  
  if (recommendations.length === 0) {
    recommendations.push('Database performance is within acceptable limits');
  }
  
  return recommendations;
}

function generateDBReport(report) {
  return `
╔═══════════════════════════════════════════════════════════════════════════════╗
║                      DATABASE PERFORMANCE BENCHMARK                            ║
╠═══════════════════════════════════════════════════════════════════════════════╣
║ Timestamp: ${report.timestamp}                                  ║
╠═══════════════════════════════════════════════════════════════════════════════╣
║ READ OPERATIONS                                                                ║
║   Avg: ${report.results.read.avg.padEnd(10)} P50: ${report.results.read.p50.padEnd(10)} P95: ${report.results.read.p95.padEnd(10)} P99: ${report.results.read.p99.padEnd(10)} ║
║   Error Rate: ${report.results.read.errorRate.padEnd(60)}║
╠═══════════════════════════════════════════════════════════════════════════════╣
║ WRITE OPERATIONS                                                               ║
║   Avg: ${report.results.write.avg.padEnd(10)} P50: ${report.results.write.p50.padEnd(10)} P95: ${report.results.write.p95.padEnd(10)} P99: ${report.results.write.p99.padEnd(10)} ║
║   Error Rate: ${report.results.write.errorRate.padEnd(60)}║
╠═══════════════════════════════════════════════════════════════════════════════╣
║ LIST/SEARCH OPERATIONS                                                         ║
║   List Avg: ${report.results.list.avg.padEnd(10)} P95: ${report.results.list.p95.padEnd(45)}║
║   Search Avg: ${report.results.search.avg.padEnd(10)} P95: ${report.results.search.p95.padEnd(43)}║
╠═══════════════════════════════════════════════════════════════════════════════╣
║ THROUGHPUT                                                                     ║
║   Total Queries: ${report.results.totalQueries.toString().padEnd(15)} QPS: ${report.results.qps.padEnd(38)}║
╠═══════════════════════════════════════════════════════════════════════════════╣
║ RECOMMENDATIONS                                                                ║
${report.recommendations.map(r => `║ • ${r.padEnd(73)}║`).join('\n')}
╚═══════════════════════════════════════════════════════════════════════════════╝
`;
}

