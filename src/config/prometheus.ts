import client from 'prom-client';
import { register } from '@/middleware/prometheus.js';

/**
 * FinBot-specific Prometheus metrics
 */
export const finbotMetrics = {
  // Counter: Total number of FinBot API requests
  requestTotal: new client.Counter({
    name: 'finbot_api_request_total',
    help: 'Total number of FinBot API requests',
    labelNames: ['method', 'path', 'status_code'],
    registers: [register],
  }),

  // Histogram: Duration of FinBot API requests
  requestDuration: new client.Histogram({
    name: 'finbot_api_request_duration_seconds',
    help: 'Duration of FinBot API requests in seconds',
    labelNames: ['method', 'path', 'status_code'],
    buckets: [0.01, 0.05, 0.1, 0.3, 0.5, 1, 2, 5, 10],
    registers: [register],
  }),
};

// Register metrics
register.registerMetric(finbotMetrics.requestTotal);
register.registerMetric(finbotMetrics.requestDuration);

