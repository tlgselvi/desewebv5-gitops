/**
 * Redis Cache Performance Benchmark
 * 
 * Tests cache hit/miss rates and cache performance
 * Measures caching effectiveness and latency improvements
 */

import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Trend, Rate, Counter, Gauge } from 'k6/metrics';

// Cache-specific metrics
const cacheHitDuration = new Trend('cache_hit_duration');
const cacheMissDuration = new Trend('cache_miss_duration');
const cachedEndpointDuration = new Trend('cached_endpoint_duration');
const uncachedEndpointDuration = new Trend('uncached_endpoint_duration');
const cacheHitRate = new Rate('cache_hit_rate');
const cacheEffectiveness = new Gauge('cache_effectiveness');
const requestsTotal = new Counter('requests_total');

export const options = {
  scenarios: {
    // Cold cache test
    cold_cache: {
      executor: 'constant-vus',
      vus: 5,
      duration: '1m',
      exec: 'coldCacheTest',
      startTime: '0s',
    },
    // Warm cache test
    warm_cache: {
      executor: 'constant-vus',
      vus: 10,
      duration: '2m',
      exec: 'warmCacheTest',
      startTime: '1m30s',
    },
    // Cache saturation test
    saturation: {
      executor: 'ramping-vus',
      startVUs: 10,
      stages: [
        { duration: '1m', target: 30 },
        { duration: '2m', target: 30 },
        { duration: '1m', target: 10 },
      ],
      exec: 'saturationTest',
      startTime: '4m',
    },
  },
  thresholds: {
    'cache_hit_duration': ['p(95)<50'],    // Cache hits should be very fast
    'cached_endpoint_duration': ['p(95)<100'],
    'cache_hit_rate': ['rate>0.7'],        // At least 70% cache hit rate
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

// Endpoints that are typically cached
const cachedEndpoints = [
  { url: '/finance/accounts', ttl: 60 },
  { url: '/crm/contacts', ttl: 60 },
  { url: '/inventory/products', ttl: 60 },
  { url: '/hr/employees', ttl: 60 },
  { url: '/iot/devices', ttl: 30 },
];

// Cold cache test - first requests will miss
export function coldCacheTest() {
  group('Cold Cache Test', () => {
    // Force cache miss by adding unique query param
    const uniqueParam = `_cache_bust=${Date.now()}-${__ITER}`;
    
    cachedEndpoints.forEach(endpoint => {
      const url = `${BASE_URL}${endpoint.url}?${uniqueParam}&page=1&limit=10`;
      const res = http.get(url, params);
      
      cacheMissDuration.add(res.timings.duration);
      uncachedEndpointDuration.add(res.timings.duration);
      requestsTotal.add(1);
      
      // Cold cache = miss
      cacheHitRate.add(0);
      
      check(res, {
        'cold cache response ok': (r) => r.status === 200 || r.status === 401,
      });
    });
    
    sleep(1);
  });
}

// Warm cache test - repeated requests should hit cache
export function warmCacheTest() {
  group('Warm Cache Test', () => {
    // Use same query params to hit cache
    const staticParams = '?page=1&limit=20';
    
    cachedEndpoints.forEach(endpoint => {
      // First request (might be miss)
      let res = http.get(`${BASE_URL}${endpoint.url}${staticParams}`, params);
      const firstDuration = res.timings.duration;
      requestsTotal.add(1);
      
      // Second request (should be hit)
      res = http.get(`${BASE_URL}${endpoint.url}${staticParams}`, params);
      const secondDuration = res.timings.duration;
      requestsTotal.add(1);
      
      // If second request is significantly faster, it's a cache hit
      const isCacheHit = secondDuration < firstDuration * 0.7;
      
      if (isCacheHit) {
        cacheHitDuration.add(secondDuration);
        cacheHitRate.add(1);
        cachedEndpointDuration.add(secondDuration);
      } else {
        cacheMissDuration.add(secondDuration);
        cacheHitRate.add(0);
        uncachedEndpointDuration.add(secondDuration);
      }
      
      check(res, {
        'warm cache response ok': (r) => r.status === 200 || r.status === 401,
        'cache effective': () => isCacheHit || secondDuration < 200,
      });
    });
    
    sleep(0.5);
  });
}

// Cache saturation test - high load to test cache under pressure
export function saturationTest() {
  group('Cache Saturation Test', () => {
    // Random endpoint selection
    const endpoint = cachedEndpoints[Math.floor(Math.random() * cachedEndpoints.length)];
    
    // Mix of cache-hitting and cache-busting requests
    const random = Math.random();
    let url;
    let expectedCacheHit = false;
    
    if (random < 0.8) {
      // 80% - use cached params
      url = `${BASE_URL}${endpoint.url}?page=1&limit=20`;
      expectedCacheHit = true;
    } else {
      // 20% - unique params (cache miss)
      url = `${BASE_URL}${endpoint.url}?page=${Math.floor(Math.random() * 10) + 1}&limit=20`;
      expectedCacheHit = false;
    }
    
    const res = http.get(url, params);
    requestsTotal.add(1);
    
    // Determine if likely cache hit based on response time
    const isFast = res.timings.duration < 100;
    
    if (isFast) {
      cacheHitDuration.add(res.timings.duration);
      cacheHitRate.add(1);
      cachedEndpointDuration.add(res.timings.duration);
    } else {
      cacheMissDuration.add(res.timings.duration);
      cacheHitRate.add(0);
      uncachedEndpointDuration.add(res.timings.duration);
    }
    
    // Calculate effectiveness
    const effectiveness = isFast ? 1 : 0;
    cacheEffectiveness.add(effectiveness);
    
    check(res, {
      'saturation response ok': (r) => r.status === 200 || r.status === 401,
      'response time acceptable': (r) => r.timings.duration < 500,
    });
    
    sleep(0.1);
  });
}

export function handleSummary(data) {
  const { metrics: m } = data;
  
  const hitRate = ((m.cache_hit_rate?.values?.rate || 0) * 100).toFixed(2);
  const hitAvg = (m.cache_hit_duration?.values?.avg || 0).toFixed(2);
  const missAvg = (m.cache_miss_duration?.values?.avg || 0).toFixed(2);
  const speedup = missAvg > 0 && hitAvg > 0 ? ((missAvg - hitAvg) / missAvg * 100).toFixed(1) : 0;
  
  const report = {
    timestamp: new Date().toISOString(),
    testType: 'Redis Cache Performance Benchmark',
    environment: BASE_URL,
    results: {
      cacheHitRate: hitRate + '%',
      cacheHit: {
        avg: hitAvg + 'ms',
        p50: (m.cache_hit_duration?.values?.med || 0).toFixed(2) + 'ms',
        p95: (m.cache_hit_duration?.values?.['p(95)'] || 0).toFixed(2) + 'ms',
        count: m.cache_hit_duration?.values?.count || 0,
      },
      cacheMiss: {
        avg: missAvg + 'ms',
        p50: (m.cache_miss_duration?.values?.med || 0).toFixed(2) + 'ms',
        p95: (m.cache_miss_duration?.values?.['p(95)'] || 0).toFixed(2) + 'ms',
        count: m.cache_miss_duration?.values?.count || 0,
      },
      speedupPercentage: speedup + '%',
      totalRequests: m.requests_total?.values?.count || 0,
    },
    analysis: analyzeCachePerformance(hitRate, hitAvg, missAvg),
  };
  
  return {
    'tests/load/results/cache-benchmark.json': JSON.stringify(report, null, 2),
    'stdout': generateCacheReport(report),
  };
}

function analyzeCachePerformance(hitRate, hitAvg, missAvg) {
  const rate = parseFloat(hitRate);
  const hit = parseFloat(hitAvg);
  const miss = parseFloat(missAvg);
  
  let status, recommendations;
  
  if (rate >= 80 && hit < 50) {
    status = '🟢 EXCELLENT';
    recommendations = [
      'Cache performance is optimal',
      'Consider extending TTL for stable data',
    ];
  } else if (rate >= 60 && hit < 100) {
    status = '🟡 GOOD';
    recommendations = [
      'Cache hit rate could be improved',
      'Review cache invalidation strategy',
      'Consider pre-warming cache for hot data',
    ];
  } else if (rate >= 40) {
    status = '🟠 NEEDS IMPROVEMENT';
    recommendations = [
      'Low cache hit rate detected',
      'Review caching strategy',
      'Consider increasing cache size',
      'Check for cache stampede issues',
    ];
  } else {
    status = '🔴 POOR';
    recommendations = [
      'Cache is not effective',
      'Verify Redis connection',
      'Review cached endpoints',
      'Consider implementing cache-aside pattern',
    ];
  }
  
  return { status, recommendations };
}

function generateCacheReport(report) {
  return `
╔═══════════════════════════════════════════════════════════════════════════════╗
║                       REDIS CACHE PERFORMANCE BENCHMARK                        ║
╠═══════════════════════════════════════════════════════════════════════════════╣
║ Timestamp: ${report.timestamp}                                  ║
╠═══════════════════════════════════════════════════════════════════════════════╣
║ CACHE HIT RATE: ${report.results.cacheHitRate.padEnd(15)} SPEEDUP: ${report.results.speedupPercentage.padEnd(20)}║
╠═══════════════════════════════════════════════════════════════════════════════╣
║ CACHE HITS                                                                     ║
║   Avg: ${report.results.cacheHit.avg.padEnd(10)} P50: ${report.results.cacheHit.p50.padEnd(10)} P95: ${report.results.cacheHit.p95.padEnd(10)} Count: ${String(report.results.cacheHit.count).padEnd(10)} ║
╠═══════════════════════════════════════════════════════════════════════════════╣
║ CACHE MISSES                                                                   ║
║   Avg: ${report.results.cacheMiss.avg.padEnd(10)} P50: ${report.results.cacheMiss.p50.padEnd(10)} P95: ${report.results.cacheMiss.p95.padEnd(10)} Count: ${String(report.results.cacheMiss.count).padEnd(10)} ║
╠═══════════════════════════════════════════════════════════════════════════════╣
║ Total Requests: ${report.results.totalRequests.toString().padEnd(58)}║
╠═══════════════════════════════════════════════════════════════════════════════╣
║ ANALYSIS: ${report.analysis.status.padEnd(65)}║
╠═══════════════════════════════════════════════════════════════════════════════╣
║ RECOMMENDATIONS                                                                ║
${report.analysis.recommendations.map(r => `║ • ${r.padEnd(73)}║`).join('\n')}
╚═══════════════════════════════════════════════════════════════════════════════╝
`;
}

