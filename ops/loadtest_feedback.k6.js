import http from 'k6/http';
import { sleep, check } from 'k6';

export const options = {
  vus: 25,
  duration: '30s',
};

export default function () {
  const payload = JSON.stringify({
    metric: 'api_latency_p95',
    anomaly: true,
    verdict: Math.random() > 0.3,
    comment: 'auto-feedback',
  });
  
  const res = http.post(
    'http://localhost:8080/api/v1/aiops/feedback',
    payload,
    {
      headers: { 'Content-Type': 'application/json' },
    }
  );
  
  check(res, { 'status 200': (r) => r.status === 200 });
  sleep(0.2);
}

