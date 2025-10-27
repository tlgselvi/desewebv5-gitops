import http from 'k6/http';
import { sleep, check } from 'k6';

export const options = {
  vus: 25,
  duration: '30s',
  thresholds: {
    http_req_failed: ['rate<0.005'], // 0.5% error rate
    http_req_duration: ['p(95)<120'], // 95th percentile < 120ms
    http_req_duration: ['p(99)<200'], // 99th percentile < 200ms
    http_reqs: ['rate>50'], // Rate > 50 req/s
    http_req_duration_avg: ['avg<80'], // Average duration < 80ms
  },
};

export default function () {
  const payload = JSON.stringify({
    metric: 'api_latency_p95',
    anomaly: true,
    verdict: Math.random() > 0.3,
    comment: 'auto-feedback',
    source: 'api',
    type: 'bug',
    severity: 'high',
    note: 'Load test feedback entry',
  });

  const res = http.post(
    'http://localhost:8080/api/v1/aiops/feedback',
    payload,
    {
      headers: { 'Content-Type': 'application/json' },
    }
  );

  check(res, {
    'status 200': (r) => r.status === 200,
    'response time < 120ms': (r) => r.timings.duration < 120,
    'response has success': (r) => {
      const body = JSON.parse(r.body);
      return body.success === true;
    },
  });

  sleep(0.2);
}

