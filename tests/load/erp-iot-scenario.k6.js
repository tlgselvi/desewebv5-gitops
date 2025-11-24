import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

// Custom Metrics
const errorRate = new Rate('errors');

export const options = {
  stages: [
    { duration: '1m', target: 20 }, // Ramp up to 20 users
    { duration: '3m', target: 50 }, // Stay at 50 users
    { duration: '1m', target: 0 },  // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests must complete below 500ms
    errors: ['rate<0.01'],            // Error rate must be less than 1%
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3001/api/v1';

// Simulated User
export default function () {
  // 1. Login (Mock or Real)
  // In a real test, you would use a dedicated test user
  const loginPayload = JSON.stringify({
    email: 'test@dese.com',
    password: 'password123',
  });
  
  const params = {
    headers: {
      'Content-Type': 'application/json',
    },
  };

  // NOTE: Replace with actual auth flow if needed
  // const loginRes = http.post(`${BASE_URL}/auth/login`, loginPayload, params);
  // const token = loginRes.json('token');
  // params.headers['Authorization'] = `Bearer ${token}`;
  
  // Mock Token for now
  params.headers['Authorization'] = `Bearer mock-token`;

  // 2. Finance: Get Invoices (Read Heavy)
  const invoicesRes = http.get(`${BASE_URL}/finance/invoices`, params);
  check(invoicesRes, {
    'Invoices status is 200': (r) => r.status === 200,
  }) || errorRate.add(1);

  sleep(1);

  // 3. CRM: Get Pipeline (Read Heavy)
  const pipelineRes = http.get(`${BASE_URL}/crm/pipeline`, params);
  check(pipelineRes, {
    'Pipeline status is 200': (r) => r.status === 200,
  }) || errorRate.add(1);

  sleep(1);

  // 4. IoT: Send Telemetry (Write Heavy)
  const telemetryPayload = JSON.stringify({
    device_id: 'DEVICE-001',
    sensor: 'ph',
    value: 7.2 + Math.random(), // Random pH value
    timestamp: new Date().toISOString(),
  });

  const telemetryRes = http.post(`${BASE_URL}/iot/telemetry`, telemetryPayload, params);
  check(telemetryRes, {
    'Telemetry status is 201': (r) => r.status === 201,
  }) || errorRate.add(1);

  sleep(2);
}

