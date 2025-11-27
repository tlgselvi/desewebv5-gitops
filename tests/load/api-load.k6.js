/**
 * API Load Test
 * 
 * Standard load test for normal traffic patterns
 * Tests all major API endpoints with realistic user behavior
 */

import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const apiDuration = new Trend('api_duration');
const dbQueryDuration = new Trend('db_query_duration');
const cacheHitRate = new Rate('cache_hits');
const requestsPerEndpoint = new Counter('requests_per_endpoint');

export const options = {
  stages: [
    { duration: '2m', target: 20 },   // Ramp up to 20 VUs
    { duration: '5m', target: 50 },   // Stay at 50 VUs
    { duration: '2m', target: 100 },  // Ramp up to 100 VUs
    { duration: '5m', target: 100 },  // Stay at 100 VUs
    { duration: '2m', target: 0 },    // Ramp down
  ],
  thresholds: {
    http_req_failed: ['rate<0.01'],           // Error rate < 1%
    http_req_duration: ['p(95)<500'],          // 95% of requests < 500ms
    errors: ['rate<0.01'],
    api_duration: ['p(95)<400'],
    'http_req_duration{endpoint:finance}': ['p(95)<300'],
    'http_req_duration{endpoint:crm}': ['p(95)<300'],
    'http_req_duration{endpoint:inventory}': ['p(95)<300'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000/api/v1';
const AUTH_TOKEN = __ENV.AUTH_TOKEN || 'mock-token';

const params = {
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${AUTH_TOKEN}`,
  },
  tags: {},
};

// User scenarios with weights
const scenarios = [
  { name: 'Finance User', weight: 30 },
  { name: 'CRM User', weight: 25 },
  { name: 'Inventory User', weight: 20 },
  { name: 'IoT User', weight: 15 },
  { name: 'HR User', weight: 10 },
];

export default function () {
  // Select scenario based on weight
  const scenario = selectScenario();
  
  switch (scenario) {
    case 'Finance User':
      financeUserScenario();
      break;
    case 'CRM User':
      crmUserScenario();
      break;
    case 'Inventory User':
      inventoryUserScenario();
      break;
    case 'IoT User':
      iotUserScenario();
      break;
    case 'HR User':
      hrUserScenario();
      break;
  }
}

function selectScenario() {
  const random = Math.random() * 100;
  let cumulative = 0;
  
  for (const scenario of scenarios) {
    cumulative += scenario.weight;
    if (random < cumulative) {
      return scenario.name;
    }
  }
  return scenarios[0].name;
}

function financeUserScenario() {
  group('Finance User Flow', () => {
    // Get accounts list
    let res = http.get(`${BASE_URL}/finance/accounts`, {
      ...params,
      tags: { endpoint: 'finance' },
    });
    check(res, { 'accounts list': (r) => r.status === 200 || r.status === 401 }) || errorRate.add(1);
    apiDuration.add(res.timings.duration);
    requestsPerEndpoint.add(1, { endpoint: 'finance_accounts' });
    
    sleep(1);

    // Get invoices
    res = http.get(`${BASE_URL}/finance/invoices?page=1&limit=20`, {
      ...params,
      tags: { endpoint: 'finance' },
    });
    check(res, { 'invoices list': (r) => r.status === 200 || r.status === 401 }) || errorRate.add(1);
    apiDuration.add(res.timings.duration);
    requestsPerEndpoint.add(1, { endpoint: 'finance_invoices' });
    
    sleep(2);

    // Get transactions
    res = http.get(`${BASE_URL}/finance/transactions?page=1&limit=50`, {
      ...params,
      tags: { endpoint: 'finance' },
    });
    check(res, { 'transactions list': (r) => r.status === 200 || r.status === 401 }) || errorRate.add(1);
    apiDuration.add(res.timings.duration);
    requestsPerEndpoint.add(1, { endpoint: 'finance_transactions' });
    
    sleep(1);
  });
}

function crmUserScenario() {
  group('CRM User Flow', () => {
    // Get contacts
    let res = http.get(`${BASE_URL}/crm/contacts?page=1&limit=20`, {
      ...params,
      tags: { endpoint: 'crm' },
    });
    check(res, { 'contacts list': (r) => r.status === 200 || r.status === 401 }) || errorRate.add(1);
    apiDuration.add(res.timings.duration);
    requestsPerEndpoint.add(1, { endpoint: 'crm_contacts' });
    
    sleep(1);

    // Get deals
    res = http.get(`${BASE_URL}/crm/deals?page=1&limit=20`, {
      ...params,
      tags: { endpoint: 'crm' },
    });
    check(res, { 'deals list': (r) => r.status === 200 || r.status === 401 }) || errorRate.add(1);
    apiDuration.add(res.timings.duration);
    requestsPerEndpoint.add(1, { endpoint: 'crm_deals' });
    
    sleep(2);

    // Get pipeline
    res = http.get(`${BASE_URL}/crm/pipeline`, {
      ...params,
      tags: { endpoint: 'crm' },
    });
    check(res, { 'pipeline data': (r) => r.status === 200 || r.status === 401 }) || errorRate.add(1);
    apiDuration.add(res.timings.duration);
    requestsPerEndpoint.add(1, { endpoint: 'crm_pipeline' });
    
    sleep(1);
  });
}

function inventoryUserScenario() {
  group('Inventory User Flow', () => {
    // Get products
    let res = http.get(`${BASE_URL}/inventory/products?page=1&limit=50`, {
      ...params,
      tags: { endpoint: 'inventory' },
    });
    check(res, { 'products list': (r) => r.status === 200 || r.status === 401 }) || errorRate.add(1);
    apiDuration.add(res.timings.duration);
    requestsPerEndpoint.add(1, { endpoint: 'inventory_products' });
    
    sleep(1);

    // Get stock levels
    res = http.get(`${BASE_URL}/inventory/stock`, {
      ...params,
      tags: { endpoint: 'inventory' },
    });
    check(res, { 'stock levels': (r) => r.status === 200 || r.status === 401 }) || errorRate.add(1);
    apiDuration.add(res.timings.duration);
    requestsPerEndpoint.add(1, { endpoint: 'inventory_stock' });
    
    sleep(2);

    // Get warehouses
    res = http.get(`${BASE_URL}/inventory/warehouses`, {
      ...params,
      tags: { endpoint: 'inventory' },
    });
    check(res, { 'warehouses list': (r) => r.status === 200 || r.status === 401 }) || errorRate.add(1);
    apiDuration.add(res.timings.duration);
    requestsPerEndpoint.add(1, { endpoint: 'inventory_warehouses' });
    
    sleep(1);
  });
}

function iotUserScenario() {
  group('IoT User Flow', () => {
    // Get devices
    let res = http.get(`${BASE_URL}/iot/devices`, {
      ...params,
      tags: { endpoint: 'iot' },
    });
    check(res, { 'devices list': (r) => r.status === 200 || r.status === 401 }) || errorRate.add(1);
    apiDuration.add(res.timings.duration);
    requestsPerEndpoint.add(1, { endpoint: 'iot_devices' });
    
    sleep(1);

    // Send telemetry (write operation)
    const telemetryPayload = JSON.stringify({
      deviceId: `DEVICE-${Math.floor(Math.random() * 100)}`,
      sensor: 'temperature',
      value: 20 + Math.random() * 15,
      timestamp: new Date().toISOString(),
    });

    res = http.post(`${BASE_URL}/iot/telemetry`, telemetryPayload, {
      ...params,
      tags: { endpoint: 'iot' },
    });
    check(res, { 'telemetry sent': (r) => r.status === 201 || r.status === 200 || r.status === 401 }) || errorRate.add(1);
    apiDuration.add(res.timings.duration);
    requestsPerEndpoint.add(1, { endpoint: 'iot_telemetry' });
    
    sleep(2);

    // Get alerts
    res = http.get(`${BASE_URL}/iot/alerts`, {
      ...params,
      tags: { endpoint: 'iot' },
    });
    check(res, { 'alerts list': (r) => r.status === 200 || r.status === 401 }) || errorRate.add(1);
    apiDuration.add(res.timings.duration);
    requestsPerEndpoint.add(1, { endpoint: 'iot_alerts' });
    
    sleep(1);
  });
}

function hrUserScenario() {
  group('HR User Flow', () => {
    // Get employees
    let res = http.get(`${BASE_URL}/hr/employees?page=1&limit=20`, {
      ...params,
      tags: { endpoint: 'hr' },
    });
    check(res, { 'employees list': (r) => r.status === 200 || r.status === 401 }) || errorRate.add(1);
    apiDuration.add(res.timings.duration);
    requestsPerEndpoint.add(1, { endpoint: 'hr_employees' });
    
    sleep(1);

    // Get departments
    res = http.get(`${BASE_URL}/hr/departments`, {
      ...params,
      tags: { endpoint: 'hr' },
    });
    check(res, { 'departments list': (r) => r.status === 200 || r.status === 401 }) || errorRate.add(1);
    apiDuration.add(res.timings.duration);
    requestsPerEndpoint.add(1, { endpoint: 'hr_departments' });
    
    sleep(2);

    // Get payrolls
    res = http.get(`${BASE_URL}/hr/payrolls`, {
      ...params,
      tags: { endpoint: 'hr' },
    });
    check(res, { 'payrolls list': (r) => r.status === 200 || r.status === 401 }) || errorRate.add(1);
    apiDuration.add(res.timings.duration);
    requestsPerEndpoint.add(1, { endpoint: 'hr_payrolls' });
    
    sleep(1);
  });
}

export function handleSummary(data) {
  return {
    'tests/load/results/load-test-summary.json': JSON.stringify(data, null, 2),
  };
}

