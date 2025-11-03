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

/**
 * Redis Streams event bus metrics
 */
export const finbotStreamMetrics = {
  // Counter: Total events published to stream
  eventsPublished: new client.Counter({
    name: 'finbot_stream_events_published_total',
    help: 'Total number of events published to Redis Stream',
    labelNames: ['stream', 'event_type'],
    registers: [register],
  }),

  // Counter: Total messages received from stream
  messagesReceived: new client.Counter({
    name: 'finbot_stream_messages_received_total',
    help: 'Total number of messages received from Redis Stream',
    labelNames: ['stream'],
    registers: [register],
  }),

  // Counter: Total events processed successfully
  eventsProcessed: new client.Counter({
    name: 'finbot_stream_events_processed_total',
    help: 'Total number of events processed successfully',
    labelNames: ['event_type'],
    registers: [register],
  }),

  // Counter: Total events failed to process
  eventsFailed: new client.Counter({
    name: 'finbot_stream_events_failed_total',
    help: 'Total number of events failed to process',
    labelNames: ['event_type'],
    registers: [register],
  }),

  // Counter: Total consume errors
  consumeErrors: new client.Counter({
    name: 'finbot_stream_consume_errors_total',
    help: 'Total number of errors during message consumption',
    registers: [register],
  }),

  // Counter: Total events moved to DLQ
  eventsDLQ: new client.Counter({
    name: 'finbot_stream_events_dlq_total',
    help: 'Total number of events moved to dead-letter queue',
    registers: [register],
  }),

  // Gauge: Current consumer lag (pending messages)
  consumerLag: new client.Gauge({
    name: 'finbot_stream_consumer_lag',
    help: 'Current consumer lag (number of pending messages)',
    labelNames: ['stream', 'consumer_group'],
    registers: [register],
  }),
};

// Register stream metrics
register.registerMetric(finbotStreamMetrics.eventsPublished);
register.registerMetric(finbotStreamMetrics.messagesReceived);
register.registerMetric(finbotStreamMetrics.eventsProcessed);
register.registerMetric(finbotStreamMetrics.eventsFailed);
register.registerMetric(finbotStreamMetrics.consumeErrors);
register.registerMetric(finbotStreamMetrics.eventsDLQ);
register.registerMetric(finbotStreamMetrics.consumerLag);

/**
 * Audit Trail metrics
 */
export const auditEventsTotal = new client.Counter({
  name: 'audit_events_total',
  help: 'Toplam audit olay sayısı',
  labelNames: ['status'],
  registers: [register],
});

export const auditWriteFailuresTotal = new client.Counter({
  name: 'audit_write_failures_total',
  help: 'Audit yazma hataları toplamı',
  registers: [register],
});

export const auditLatency = new client.Histogram({
  name: 'audit_latency_seconds',
  help: 'Audit olayları yazım gecikmesi',
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2],
  registers: [register],
});

// Register audit metrics
register.registerMetric(auditEventsTotal);
register.registerMetric(auditWriteFailuresTotal);
register.registerMetric(auditLatency);

/**
 * WebSocket metrics
 */
export const wsConnections = new client.Gauge({
  name: 'ws_connections',
  help: 'Aktif WS bağlantıları',
  registers: [register],
});

export const wsBroadcastTotal = new client.Counter({
  name: 'ws_broadcast_total',
  help: 'WS broadcast toplamı',
  registers: [register],
});

export const wsLatency = new client.Histogram({
  name: 'ws_latency_seconds',
  help: 'WS RTT dağılımı',
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1],
  registers: [register],
});

/**
 * Redis Stream consumer lag metrics
 */
export const streamConsumerLag = new client.Gauge({
  name: 'stream_consumer_lag',
  help: 'Redis Stream consumer lag',
  labelNames: ['stream', 'group'],
  registers: [register],
});

// Register WebSocket and Stream metrics
register.registerMetric(wsConnections);
register.registerMetric(wsBroadcastTotal);
register.registerMetric(wsLatency);
register.registerMetric(streamConsumerLag);

