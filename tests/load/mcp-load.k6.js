/**
 * MCP Server Load Test
 * 
 * Tests performance of all 10 MCP servers
 * Measures response times and throughput
 */

import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// Custom metrics per MCP server
const mcpMetrics = {};
const mcpNames = ['finbot', 'mubot', 'dese', 'observability', 'seo', 'service', 'crm', 'inventory', 'hr', 'iot'];

mcpNames.forEach(name => {
  mcpMetrics[name] = {
    duration: new Trend(`mcp_${name}_duration`),
    errors: new Rate(`mcp_${name}_errors`),
    requests: new Counter(`mcp_${name}_requests`),
  };
});

export const options = {
  stages: [
    { duration: '1m', target: 10 },   // Ramp up
    { duration: '3m', target: 30 },   // Normal load
    { duration: '2m', target: 50 },   // High load
    { duration: '1m', target: 0 },    // Ramp down
  ],
  thresholds: {
    http_req_failed: ['rate<0.02'],
    http_req_duration: ['p(95)<300'],  // MCP should be fast
    'mcp_finbot_duration': ['p(95)<200'],
    'mcp_observability_duration': ['p(95)<200'],
  },
};

// MCP server configuration
const MCP_BASE = __ENV.MCP_BASE || 'http://localhost';
const AUTH_TOKEN = __ENV.AUTH_TOKEN || 'mock-token';

const mcpServers = [
  { name: 'finbot', port: 5555, endpoints: ['/finbot/health', '/finbot/metrics'] },
  { name: 'mubot', port: 5556, endpoints: ['/mubot/health'] },
  { name: 'dese', port: 5557, endpoints: ['/dese/health', '/dese/anomalies'] },
  { name: 'observability', port: 5558, endpoints: ['/observability/health', '/observability/metrics'] },
  { name: 'seo', port: 5559, endpoints: ['/seo/health'] },
  { name: 'service', port: 5560, endpoints: ['/service/health'] },
  { name: 'crm', port: 5561, endpoints: ['/crm/health'] },
  { name: 'inventory', port: 5562, endpoints: ['/inventory/health'] },
  { name: 'hr', port: 5563, endpoints: ['/hr/health'] },
  { name: 'iot', port: 5564, endpoints: ['/iot/health', '/iot/devices'] },
];

const params = {
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${AUTH_TOKEN}`,
  },
  timeout: '10s',
};

export default function () {
  // Select random MCP server
  const server = mcpServers[Math.floor(Math.random() * mcpServers.length)];
  const endpoint = server.endpoints[Math.floor(Math.random() * server.endpoints.length)];
  
  group(`MCP ${server.name}`, () => {
    const url = `${MCP_BASE}:${server.port}${endpoint}`;
    
    const res = http.get(url, params);
    
    const success = check(res, {
      'status ok': (r) => r.status === 200,
      'response time ok': (r) => r.timings.duration < 300,
      'has body': (r) => r.body && r.body.length > 0,
    });
    
    // Record metrics
    mcpMetrics[server.name].duration.add(res.timings.duration);
    mcpMetrics[server.name].requests.add(1);
    
    if (!success) {
      mcpMetrics[server.name].errors.add(1);
    }
  });
  
  sleep(0.5);
}

// Also test context aggregation
export function contextAggregationTest() {
  group('Context Aggregation', () => {
    // Test multi-module query
    const aggregationPayload = JSON.stringify({
      modules: ['finance', 'crm', 'inventory'],
      query: 'dashboard_overview',
    });
    
    const res = http.post(`${MCP_BASE}:5558/observability/aggregate`, aggregationPayload, params);
    
    check(res, {
      'aggregation ok': (r) => r.status === 200 || r.status === 401,
      'aggregation fast': (r) => r.timings.duration < 500,
    });
  });
}

export function handleSummary(data) {
  const { metrics } = data;
  
  // Build MCP-specific summary
  const mcpSummary = {};
  
  mcpNames.forEach(name => {
    const durationKey = `mcp_${name}_duration`;
    const errorsKey = `mcp_${name}_errors`;
    const requestsKey = `mcp_${name}_requests`;
    
    mcpSummary[name] = {
      avgDuration: (metrics[durationKey]?.values?.avg || 0).toFixed(2) + 'ms',
      p95Duration: (metrics[durationKey]?.values?.['p(95)'] || 0).toFixed(2) + 'ms',
      errorRate: ((metrics[errorsKey]?.values?.rate || 0) * 100).toFixed(2) + '%',
      totalRequests: metrics[requestsKey]?.values?.count || 0,
    };
  });
  
  const summary = {
    timestamp: new Date().toISOString(),
    testType: 'MCP Load Test',
    overall: {
      totalRequests: metrics.http_reqs?.values?.count || 0,
      avgDuration: (metrics.http_req_duration?.values?.avg || 0).toFixed(2) + 'ms',
      p95Duration: (metrics.http_req_duration?.values?.['p(95)'] || 0).toFixed(2) + 'ms',
      errorRate: ((metrics.http_req_failed?.values?.rate || 0) * 100).toFixed(2) + '%',
    },
    mcpServers: mcpSummary,
  };
  
  return {
    'tests/load/results/mcp-load-summary.json': JSON.stringify(summary, null, 2),
    'stdout': generateMCPReport(summary),
  };
}

function generateMCPReport(summary) {
  let report = `
╔═══════════════════════════════════════════════════════════════╗
║                   MCP LOAD TEST REPORT                         ║
╠═══════════════════════════════════════════════════════════════╣
║ Timestamp: ${summary.timestamp}                    ║
╠═══════════════════════════════════════════════════════════════╣
║ OVERALL RESULTS                                                ║
║ - Total Requests: ${summary.overall.totalRequests.toString().padEnd(38)}║
║ - Avg Duration: ${summary.overall.avgDuration.padEnd(40)}║
║ - P95 Duration: ${summary.overall.p95Duration.padEnd(40)}║
║ - Error Rate: ${summary.overall.errorRate.padEnd(42)}║
╠═══════════════════════════════════════════════════════════════╣
║ MCP SERVER RESULTS                                             ║
`;

  Object.entries(summary.mcpServers).forEach(([name, data]) => {
    const status = parseFloat(data.errorRate) > 1 ? '🔴' : parseFloat(data.p95Duration) > 200 ? '🟡' : '🟢';
    report += `║ ${status} ${name.padEnd(12)} | P95: ${data.p95Duration.padEnd(8)} | Err: ${data.errorRate.padEnd(6)} ║\n`;
  });

  report += `╚═══════════════════════════════════════════════════════════════╝`;
  
  return report;
}

