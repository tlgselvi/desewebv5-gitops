/**
 * API Performance Benchmark
 * 
 * Establishes performance baselines for all API endpoints
 * Run periodically to detect performance regressions
 */

import http from 'k6/http';
import { check, group } from 'k6';
import { Trend, Rate, Counter } from 'k6/metrics';

// Endpoint-specific metrics
const endpoints = [
  'health',
  'finance_accounts',
  'finance_invoices',
  'crm_contacts',
  'crm_deals',
  'inventory_products',
  'inventory_stock',
  'hr_employees',
  'iot_devices',
  'iot_telemetry',
];

const metrics = {};
endpoints.forEach(ep => {
  metrics[ep] = {
    duration: new Trend(`benchmark_${ep}_duration`),
    ttfb: new Trend(`benchmark_${ep}_ttfb`),
    errors: new Rate(`benchmark_${ep}_errors`),
    requests: new Counter(`benchmark_${ep}_requests`),
  };
});

export const options = {
  scenarios: {
    // Run each endpoint in isolation for accurate measurements
    health_check: {
      executor: 'constant-vus',
      vus: 5,
      duration: '30s',
      exec: 'benchmarkHealth',
      startTime: '0s',
    },
    finance: {
      executor: 'constant-vus',
      vus: 5,
      duration: '30s',
      exec: 'benchmarkFinance',
      startTime: '35s',
    },
    crm: {
      executor: 'constant-vus',
      vus: 5,
      duration: '30s',
      exec: 'benchmarkCRM',
      startTime: '70s',
    },
    inventory: {
      executor: 'constant-vus',
      vus: 5,
      duration: '30s',
      exec: 'benchmarkInventory',
      startTime: '105s',
    },
    hr: {
      executor: 'constant-vus',
      vus: 5,
      duration: '30s',
      exec: 'benchmarkHR',
      startTime: '140s',
    },
    iot: {
      executor: 'constant-vus',
      vus: 5,
      duration: '30s',
      exec: 'benchmarkIoT',
      startTime: '175s',
    },
  },
  thresholds: {
    // Baseline thresholds - adjust based on actual performance
    'benchmark_health_duration': ['p(95)<100'],
    'benchmark_finance_accounts_duration': ['p(95)<300'],
    'benchmark_crm_contacts_duration': ['p(95)<300'],
    'benchmark_inventory_products_duration': ['p(95)<300'],
    'benchmark_hr_employees_duration': ['p(95)<300'],
    'benchmark_iot_devices_duration': ['p(95)<300'],
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

function recordMetrics(endpoint, res) {
  metrics[endpoint].duration.add(res.timings.duration);
  metrics[endpoint].ttfb.add(res.timings.waiting);
  metrics[endpoint].requests.add(1);
  
  const success = res.status === 200 || res.status === 401;
  if (!success) {
    metrics[endpoint].errors.add(1);
  }
  
  return success;
}

export function benchmarkHealth() {
  group('Health Benchmark', () => {
    const res = http.get(`${BASE_URL.replace('/api/v1', '')}/health`);
    recordMetrics('health', res);
    
    check(res, {
      'health status 200': (r) => r.status === 200,
      'health latency < 100ms': (r) => r.timings.duration < 100,
    });
  });
}

export function benchmarkFinance() {
  group('Finance Benchmark', () => {
    // Accounts
    let res = http.get(`${BASE_URL}/finance/accounts`, params);
    recordMetrics('finance_accounts', res);
    check(res, {
      'accounts status ok': (r) => r.status === 200 || r.status === 401,
      'accounts latency < 300ms': (r) => r.timings.duration < 300,
    });
    
    // Invoices
    res = http.get(`${BASE_URL}/finance/invoices?page=1&limit=20`, params);
    recordMetrics('finance_invoices', res);
    check(res, {
      'invoices status ok': (r) => r.status === 200 || r.status === 401,
      'invoices latency < 300ms': (r) => r.timings.duration < 300,
    });
  });
}

export function benchmarkCRM() {
  group('CRM Benchmark', () => {
    // Contacts
    let res = http.get(`${BASE_URL}/crm/contacts?page=1&limit=20`, params);
    recordMetrics('crm_contacts', res);
    check(res, {
      'contacts status ok': (r) => r.status === 200 || r.status === 401,
      'contacts latency < 300ms': (r) => r.timings.duration < 300,
    });
    
    // Deals
    res = http.get(`${BASE_URL}/crm/deals?page=1&limit=20`, params);
    recordMetrics('crm_deals', res);
    check(res, {
      'deals status ok': (r) => r.status === 200 || r.status === 401,
      'deals latency < 300ms': (r) => r.timings.duration < 300,
    });
  });
}

export function benchmarkInventory() {
  group('Inventory Benchmark', () => {
    // Products
    let res = http.get(`${BASE_URL}/inventory/products?page=1&limit=50`, params);
    recordMetrics('inventory_products', res);
    check(res, {
      'products status ok': (r) => r.status === 200 || r.status === 401,
      'products latency < 300ms': (r) => r.timings.duration < 300,
    });
    
    // Stock
    res = http.get(`${BASE_URL}/inventory/stock`, params);
    recordMetrics('inventory_stock', res);
    check(res, {
      'stock status ok': (r) => r.status === 200 || r.status === 401,
      'stock latency < 300ms': (r) => r.timings.duration < 300,
    });
  });
}

export function benchmarkHR() {
  group('HR Benchmark', () => {
    // Employees
    const res = http.get(`${BASE_URL}/hr/employees?page=1&limit=20`, params);
    recordMetrics('hr_employees', res);
    check(res, {
      'employees status ok': (r) => r.status === 200 || r.status === 401,
      'employees latency < 300ms': (r) => r.timings.duration < 300,
    });
  });
}

export function benchmarkIoT() {
  group('IoT Benchmark', () => {
    // Devices (read)
    let res = http.get(`${BASE_URL}/iot/devices`, params);
    recordMetrics('iot_devices', res);
    check(res, {
      'devices status ok': (r) => r.status === 200 || r.status === 401,
      'devices latency < 300ms': (r) => r.timings.duration < 300,
    });
    
    // Telemetry (write)
    const payload = JSON.stringify({
      deviceId: 'BENCH-DEVICE-001',
      sensor: 'benchmark',
      value: Math.random() * 100,
      timestamp: new Date().toISOString(),
    });
    
    res = http.post(`${BASE_URL}/iot/telemetry`, payload, params);
    recordMetrics('iot_telemetry', res);
    check(res, {
      'telemetry status ok': (r) => r.status === 201 || r.status === 200 || r.status === 401,
      'telemetry latency < 300ms': (r) => r.timings.duration < 300,
    });
  });
}

export function handleSummary(data) {
  const { metrics: m } = data;
  
  // Build benchmark report
  const report = {
    timestamp: new Date().toISOString(),
    testType: 'API Performance Benchmark',
    environment: BASE_URL,
    results: {},
  };
  
  endpoints.forEach(ep => {
    const durationKey = `benchmark_${ep}_duration`;
    const ttfbKey = `benchmark_${ep}_ttfb`;
    const errorsKey = `benchmark_${ep}_errors`;
    
    if (m[durationKey]) {
      report.results[ep] = {
        avg: (m[durationKey]?.values?.avg || 0).toFixed(2) + 'ms',
        p50: (m[durationKey]?.values?.med || 0).toFixed(2) + 'ms',
        p95: (m[durationKey]?.values?.['p(95)'] || 0).toFixed(2) + 'ms',
        p99: (m[durationKey]?.values?.['p(99)'] || 0).toFixed(2) + 'ms',
        max: (m[durationKey]?.values?.max || 0).toFixed(2) + 'ms',
        ttfb: (m[ttfbKey]?.values?.avg || 0).toFixed(2) + 'ms',
        errorRate: ((m[errorsKey]?.values?.rate || 0) * 100).toFixed(2) + '%',
      };
    }
  });
  
  return {
    'tests/load/results/api-benchmark.json': JSON.stringify(report, null, 2),
    'stdout': generateBenchmarkReport(report),
  };
}

function generateBenchmarkReport(report) {
  let output = `
╔═══════════════════════════════════════════════════════════════════════════════╗
║                         API PERFORMANCE BENCHMARK                              ║
╠═══════════════════════════════════════════════════════════════════════════════╣
║ Timestamp: ${report.timestamp}                                  ║
║ Environment: ${report.environment.padEnd(56)}║
╠═══════════════════════════════════════════════════════════════════════════════╣
║ ENDPOINT              │ AVG      │ P95      │ P99      │ TTFB     │ ERR      ║
╠═══════════════════════════════════════════════════════════════════════════════╣`;

  Object.entries(report.results).forEach(([endpoint, data]) => {
    const status = parseFloat(data.p95) > 300 ? '🔴' : parseFloat(data.p95) > 200 ? '🟡' : '🟢';
    output += `\n║ ${status} ${endpoint.padEnd(18)} │ ${data.avg.padEnd(8)} │ ${data.p95.padEnd(8)} │ ${data.p99.padEnd(8)} │ ${data.ttfb.padEnd(8)} │ ${data.errorRate.padEnd(8)} ║`;
  });

  output += `
╚═══════════════════════════════════════════════════════════════════════════════╝
`;
  
  return output;
}

