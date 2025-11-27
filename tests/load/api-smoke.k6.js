/**
 * API Smoke Test
 * 
 * Quick validation that all critical endpoints are responding
 * Run before every deployment
 */

import http from 'k6/http';
import { check, group } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const healthCheckDuration = new Trend('health_check_duration');

export const options = {
  vus: 1,
  duration: '1m',
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<1000'],
    errors: ['rate<0.01'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000/api/v1';

export default function () {
  // Health Checks
  group('Health Endpoints', () => {
    const healthRes = http.get(`${BASE_URL.replace('/api/v1', '')}/health`);
    healthCheckDuration.add(healthRes.timings.duration);
    check(healthRes, {
      'health status is 200': (r) => r.status === 200,
      'health response has status': (r) => {
        try {
          const body = JSON.parse(r.body);
          return body.status === 'healthy' || body.status === 'ok';
        } catch {
          return false;
        }
      },
    }) || errorRate.add(1);

    const liveRes = http.get(`${BASE_URL.replace('/api/v1', '')}/health/live`);
    check(liveRes, {
      'liveness check is 200': (r) => r.status === 200,
    }) || errorRate.add(1);

    const readyRes = http.get(`${BASE_URL.replace('/api/v1', '')}/health/ready`);
    check(readyRes, {
      'readiness check is 200': (r) => r.status === 200,
    }) || errorRate.add(1);
  });

  // API Endpoints (unauthenticated)
  group('Public Endpoints', () => {
    const metricsRes = http.get(`${BASE_URL.replace('/api/v1', '')}/metrics`);
    check(metricsRes, {
      'metrics endpoint responds': (r) => r.status === 200 || r.status === 401,
    }) || errorRate.add(1);
  });

  // Module Endpoints (will fail without auth, but should return 401 not 500)
  group('Module Endpoints (Auth Check)', () => {
    const endpoints = [
      '/finance/accounts',
      '/crm/contacts',
      '/inventory/products',
      '/hr/employees',
      '/iot/devices',
      '/service/requests',
    ];

    endpoints.forEach((endpoint) => {
      const res = http.get(`${BASE_URL}${endpoint}`);
      check(res, {
        [`${endpoint} returns valid response`]: (r) => 
          r.status === 200 || r.status === 401 || r.status === 403,
        [`${endpoint} not server error`]: (r) => r.status < 500,
      }) || errorRate.add(1);
    });
  });

  // MCP Endpoints
  group('MCP Health Checks', () => {
    const mcpPorts = [5555, 5556, 5557, 5558, 5559, 5560, 5561, 5562, 5563, 5564];
    const mcpNames = ['finbot', 'mubot', 'dese', 'observability', 'seo', 'service', 'crm', 'inventory', 'hr', 'iot'];
    
    // Only test if running locally
    if (BASE_URL.includes('localhost')) {
      mcpNames.forEach((name, index) => {
        const port = mcpPorts[index];
        const healthRes = http.get(`http://localhost:${port}/${name}/health`, {
          timeout: '5s',
        });
        check(healthRes, {
          [`MCP ${name} health check`]: (r) => r.status === 200,
        }); // Don't add to error rate - MCP might not be running
      });
    }
  });
}

export function handleSummary(data) {
  return {
    'stdout': textSummary(data, { indent: ' ', enableColors: true }),
    'tests/load/results/smoke-test-summary.json': JSON.stringify(data, null, 2),
  };
}

function textSummary(data, options) {
  const { metrics } = data;
  let output = '\n=== SMOKE TEST SUMMARY ===\n\n';
  
  output += `Total Requests: ${metrics.http_reqs?.values?.count || 0}\n`;
  output += `Failed Requests: ${metrics.http_req_failed?.values?.rate * 100 || 0}%\n`;
  output += `Avg Duration: ${metrics.http_req_duration?.values?.avg?.toFixed(2) || 0}ms\n`;
  output += `p95 Duration: ${metrics.http_req_duration?.values?.['p(95)']?.toFixed(2) || 0}ms\n`;
  
  return output;
}

