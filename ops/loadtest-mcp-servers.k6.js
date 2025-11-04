/**
 * MCP Servers Load Test
 * Phase-5 Sprint 1: Task 1.2
 * 
 * Tests MCP servers under load:
 * - 100 concurrent requests
 * - Response time validation
 * - Success rate monitoring
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Custom metrics
const successRate = new Rate('mcp_success_rate');
const responseTime = new Trend('mcp_response_time');

// MCP Server endpoints
const MCP_SERVERS = [
  { name: 'FinBot', url: 'http://localhost:5555/finbot/health' },
  { name: 'MuBot', url: 'http://localhost:5556/mubot/health' },
  { name: 'DESE', url: 'http://localhost:5557/dese/health' },
  { name: 'Observability', url: 'http://localhost:5558/observability/health' },
];

// Test configuration
export const options = {
  stages: [
    { duration: '10s', target: 10 },   // Ramp up to 10 users
    { duration: '30s', target: 50 },  // Ramp up to 50 users
    { duration: '30s', target: 100 }, // Ramp up to 100 users
    { duration: '30s', target: 100 }, // Stay at 100 users
    { duration: '10s', target: 0 },   // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1000'], // 95% under 500ms, 99% under 1000ms
    http_req_failed: ['rate<0.05'],                  // Less than 5% failures
    mcp_success_rate: ['rate>0.95'],                 // More than 95% success
  },
};

export default function () {
  // Test each MCP server
  for (const server of MCP_SERVERS) {
    const startTime = Date.now();
    
    const response = http.get(server.url, {
      tags: { server: server.name },
      timeout: '5s',
    });

    const duration = Date.now() - startTime;
    responseTime.add(duration, { server: server.name });

    const success = check(response, {
      [`${server.name} status is 200`]: (r) => r.status === 200,
      [`${server.name} response time < 500ms`]: (r) => r.timings.duration < 500,
      [`${server.name} has status field`]: (r) => {
        try {
          const body = JSON.parse(r.body);
          return body.status === 'healthy';
        } catch {
          return false;
        }
      },
    });

    successRate.add(success, { server: server.name });

    if (!success) {
      console.error(`${server.name} failed: ${response.status} - ${response.body}`);
    }

    sleep(0.1); // Small delay between requests
  }
}

export function handleSummary(data) {
  return {
    'reports/loadtest-mcp-servers.json': JSON.stringify(data, null, 2),
    stdout: textSummary(data, { indent: ' ', enableColors: true }),
  };
}

function textSummary(data, options) {
  let summary = '\n=== MCP Servers Load Test Summary ===\n\n';
  
  summary += `Total Requests: ${data.metrics.http_reqs.values.count}\n`;
  summary += `Success Rate: ${((1 - data.metrics.http_req_failed.values.rate) * 100).toFixed(2)}%\n`;
  summary += `Avg Response Time: ${data.metrics.http_req_duration.values.avg.toFixed(2)}ms\n`;
  summary += `P95 Response Time: ${data.metrics.http_req_duration.values['p(95)'].toFixed(2)}ms\n`;
  summary += `P99 Response Time: ${data.metrics.http_req_duration.values['p(99)'].toFixed(2)}ms\n\n`;
  
  summary += 'Thresholds:\n';
  for (const [name, threshold] of Object.entries(data.metrics)) {
    if (threshold.thresholds) {
      for (const [threshName, passed] of Object.entries(threshold.thresholds)) {
        const status = passed ? '✅' : '❌';
        summary += `  ${status} ${threshName}\n`;
      }
    }
  }
  
  return summary;
}

