/**
 * Spike Test
 * 
 * Simulates sudden traffic spikes to test auto-scaling
 * and system resilience under sudden load changes
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const spikeResponseTime = new Trend('spike_response_time');
const recoveryTime = new Trend('recovery_time');
const requestsTotal = new Counter('requests_total');

export const options = {
  stages: [
    // Baseline
    { duration: '30s', target: 10 },   // Normal traffic
    
    // Spike 1
    { duration: '10s', target: 200 },  // Sudden spike!
    { duration: '1m', target: 200 },   // Hold spike
    { duration: '10s', target: 10 },   // Quick drop
    { duration: '30s', target: 10 },   // Recovery period
    
    // Spike 2 (larger)
    { duration: '10s', target: 400 },  // Bigger spike!
    { duration: '1m', target: 400 },   // Hold spike
    { duration: '10s', target: 10 },   // Quick drop
    { duration: '30s', target: 10 },   // Recovery period
    
    // Ramp down
    { duration: '10s', target: 0 },
  ],
  thresholds: {
    http_req_failed: ['rate<0.15'],           // Allow up to 15% errors during spikes
    http_req_duration: ['p(95)<3000'],         // 95% under 3s (relaxed for spikes)
    spike_response_time: ['p(95)<2000'],
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

// Track phase for metrics
let currentPhase = 'baseline';
let phaseStartTime = Date.now();

export function setup() {
  return { startTime: Date.now() };
}

export default function (data) {
  // Determine current phase based on VU count
  const currentVUs = __VU;
  if (currentVUs > 100) {
    if (currentPhase !== 'spike') {
      currentPhase = 'spike';
      phaseStartTime = Date.now();
    }
  } else {
    if (currentPhase === 'spike') {
      currentPhase = 'recovery';
      phaseStartTime = Date.now();
    }
  }

  // Mixed endpoint requests
  const endpoints = [
    { url: '/finance/accounts', weight: 20 },
    { url: '/crm/contacts', weight: 20 },
    { url: '/inventory/products', weight: 20 },
    { url: '/iot/devices', weight: 20 },
    { url: '/hr/employees', weight: 20 },
  ];

  // Select random endpoint
  const endpoint = selectEndpoint(endpoints);
  
  const res = http.get(`${BASE_URL}${endpoint}`, params);
  
  const success = check(res, {
    'status ok': (r) => r.status === 200 || r.status === 401,
    'not server error': (r) => r.status < 500,
    'response time ok': (r) => r.timings.duration < 3000,
  });
  
  if (!success) {
    errorRate.add(1);
  }
  
  // Track metrics by phase
  spikeResponseTime.add(res.timings.duration);
  if (currentPhase === 'recovery') {
    recoveryTime.add(res.timings.duration);
  }
  
  requestsTotal.add(1);
  
  // Shorter sleep during spikes
  const sleepTime = currentPhase === 'spike' ? 0.1 : 0.5;
  sleep(sleepTime);
}

function selectEndpoint(endpoints) {
  const total = endpoints.reduce((sum, e) => sum + e.weight, 0);
  let random = Math.random() * total;
  
  for (const endpoint of endpoints) {
    random -= endpoint.weight;
    if (random <= 0) {
      return endpoint.url;
    }
  }
  return endpoints[0].url;
}

export function handleSummary(data) {
  const { metrics } = data;
  
  const summary = {
    timestamp: new Date().toISOString(),
    testType: 'Spike Test',
    results: {
      totalRequests: metrics.http_reqs?.values?.count || 0,
      errorRate: ((metrics.http_req_failed?.values?.rate || 0) * 100).toFixed(2) + '%',
      avgResponseTime: (metrics.http_req_duration?.values?.avg || 0).toFixed(2) + 'ms',
      p95ResponseTime: (metrics.http_req_duration?.values?.['p(95)'] || 0).toFixed(2) + 'ms',
      maxResponseTime: (metrics.http_req_duration?.values?.max || 0).toFixed(2) + 'ms',
      spikeP95: (metrics.spike_response_time?.values?.['p(95)'] || 0).toFixed(2) + 'ms',
    },
    spikeAnalysis: analyzeSpikePerformance(metrics),
  };
  
  return {
    'tests/load/results/spike-test-summary.json': JSON.stringify(summary, null, 2),
    'stdout': generateSpikeReport(summary),
  };
}

function analyzeSpikePerformance(metrics) {
  const errorRate = metrics.http_req_failed?.values?.rate || 0;
  const p95 = metrics.http_req_duration?.values?.['p(95)'] || 0;
  
  if (errorRate > 0.1 && p95 > 2000) {
    return {
      status: '🔴 FAILED',
      message: 'System cannot handle spikes. Auto-scaling may be too slow.',
      recommendations: [
        'Increase minimum replica count',
        'Reduce scale-up threshold',
        'Implement request queuing',
      ],
    };
  } else if (errorRate > 0.05 || p95 > 1500) {
    return {
      status: '🟡 DEGRADED',
      message: 'System handles spikes with some degradation.',
      recommendations: [
        'Monitor auto-scaling triggers',
        'Consider pre-warming during expected spikes',
      ],
    };
  } else {
    return {
      status: '🟢 PASSED',
      message: 'System handles spikes well.',
      recommendations: [
        'Current configuration is adequate',
      ],
    };
  }
}

function generateSpikeReport(summary) {
  return `
╔═══════════════════════════════════════════════════════════════╗
║                     SPIKE TEST REPORT                          ║
╠═══════════════════════════════════════════════════════════════╣
║ Timestamp: ${summary.timestamp}                    ║
╠═══════════════════════════════════════════════════════════════╣
║ RESULTS                                                        ║
║ - Total Requests: ${summary.results.totalRequests.toString().padEnd(38)}║
║ - Error Rate: ${summary.results.errorRate.padEnd(42)}║
║ - Avg Response: ${summary.results.avgResponseTime.padEnd(40)}║
║ - P95 Response: ${summary.results.p95ResponseTime.padEnd(40)}║
║ - Max Response: ${summary.results.maxResponseTime.padEnd(40)}║
╠═══════════════════════════════════════════════════════════════╣
║ SPIKE ANALYSIS                                                 ║
║ Status: ${summary.spikeAnalysis.status.padEnd(48)}║
║ ${summary.spikeAnalysis.message.substring(0, 58).padEnd(60)}║
╠═══════════════════════════════════════════════════════════════╣
║ RECOMMENDATIONS                                                ║
${summary.spikeAnalysis.recommendations.map(r => `║ • ${r.padEnd(57)}║`).join('\n')}
╚═══════════════════════════════════════════════════════════════╝
`;
}

