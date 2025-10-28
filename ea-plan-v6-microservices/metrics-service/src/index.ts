import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import { Kafka } from 'kafkajs';
import { register, collectDefaultMetrics, Counter, Histogram, Gauge } from 'prom-client';
import { z } from 'zod';
import { logger } from './utils/logger.js';

// Initialize Fastify
const fastify = Fastify({
  logger: {
    level: 'info',
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true
      }
    }
  }
});

// Register plugins
await fastify.register(helmet);
await fastify.register(cors, {
  origin: true,
  credentials: true
});

await fastify.register(swagger, {
  swagger: {
    info: {
      title: 'EA Plan v6.0 Metrics Service',
      description: 'Metrics Collection and Processing Service',
      version: '1.0.0'
    },
    host: 'localhost:3002',
    schemes: ['http', 'https'],
    consumes: ['application/json'],
    produces: ['application/json']
  }
});

await fastify.register(swaggerUi, {
  routePrefix: '/docs',
  uiConfig: {
    docExpansion: 'full',
    deepLinking: false
  }
});

// Prometheus metrics
collectDefaultMetrics();

const metricsCounter = new Counter({
  name: 'metrics_service_requests_total',
  help: 'Total number of metrics requests',
  labelNames: ['method', 'status']
});

const metricsHistogram = new Histogram({
  name: 'metrics_service_request_duration_seconds',
  help: 'Duration of metrics requests in seconds',
  labelNames: ['method']
});

const activeMetricsGauge = new Gauge({
  name: 'metrics_service_active_metrics',
  help: 'Number of active metrics being processed'
});

// Kafka setup
const kafka = new Kafka({
  clientId: 'metrics-service',
  brokers: [process.env.KAFKA_BROKER || 'localhost:9092'],
  retry: {
    initialRetryTime: 100,
    retries: 8
  }
});

const producer = kafka.producer();
const consumer = kafka.consumer({ groupId: 'metrics-processing-group' });

// Schemas
const MetricSchema = z.object({
  timestamp: z.number(),
  service: z.string(),
  metric: z.string(),
  value: z.number(),
  tags: z.record(z.string()).optional()
});

const MetricsBatchSchema = z.object({
  metrics: z.array(MetricSchema)
});

// In-memory metrics store (in production, use InfluxDB)
const metricsStore = new Map<string, any[]>();

// Routes
fastify.post('/api/v1/metrics', {
  schema: {
    description: 'Submit metrics data',
    tags: ['metrics'],
    body: {
      type: 'object',
      required: ['metrics'],
      properties: {
        metrics: {
          type: 'array',
          items: {
            type: 'object',
            required: ['timestamp', 'service', 'metric', 'value'],
            properties: {
              timestamp: { type: 'number' },
              service: { type: 'string' },
              metric: { type: 'string' },
              value: { type: 'number' },
              tags: { type: 'object' }
            }
          }
        }
      }
    },
    response: {
      200: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          processed: { type: 'number' },
          message: { type: 'string' }
        }
      }
    }
  }
}, async (request, reply) => {
  const timer = metricsHistogram.startTimer({ method: 'POST' });
  
  try {
    const { metrics } = MetricsBatchSchema.parse(request.body);
    
    // Process each metric
    for (const metric of metrics) {
      const key = `${metric.service}-${metric.metric}`;
      
      if (!metricsStore.has(key)) {
        metricsStore.set(key, []);
      }
      
      const existingMetrics = metricsStore.get(key)!;
      existingMetrics.push(metric);
      
      // Keep only last 1000 metrics per service-metric combination
      if (existingMetrics.length > 1000) {
        existingMetrics.splice(0, existingMetrics.length - 1000);
      }
      
      // Send to Kafka for further processing
      await producer.send({
        topic: 'metrics',
        messages: [{
          key: key,
          value: JSON.stringify(metric),
          timestamp: metric.timestamp.toString()
        }]
      });
    }
    
    metricsCounter.inc({ method: 'POST', status: 'success' });
    activeMetricsGauge.set(metricsStore.size);
    
    logger.info(`Processed ${metrics.length} metrics`);
    
    timer();
    
    return {
      success: true,
      processed: metrics.length,
      message: 'Metrics processed successfully'
    };
  } catch (error) {
    metricsCounter.inc({ method: 'POST', status: 'error' });
    timer();
    
    logger.error('Metrics processing error:', error);
    return reply.code(400).send({
      success: false,
      error: 'Invalid metrics data'
    });
  }
});

fastify.get('/api/v1/metrics/:service/:metric', {
  schema: {
    description: 'Get metrics for a specific service and metric',
    tags: ['metrics'],
    params: {
      type: 'object',
      required: ['service', 'metric'],
      properties: {
        service: { type: 'string' },
        metric: { type: 'string' }
      }
    },
    querystring: {
      type: 'object',
      properties: {
        limit: { type: 'number', default: 100 },
        startTime: { type: 'number' },
        endTime: { type: 'number' }
      }
    },
    response: {
      200: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          metrics: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                timestamp: { type: 'number' },
                service: { type: 'string' },
                metric: { type: 'string' },
                value: { type: 'number' },
                tags: { type: 'object' }
              }
            }
          }
        }
      }
    }
  }
}, async (request, reply) => {
  const timer = metricsHistogram.startTimer({ method: 'GET' });
  
  try {
    const { service, metric } = request.params as { service: string; metric: string };
    const { limit = 100, startTime, endTime } = request.query as { limit?: number; startTime?: number; endTime?: number };
    
    const key = `${service}-${metric}`;
    const metrics = metricsStore.get(key) || [];
    
    let filteredMetrics = metrics;
    
    if (startTime) {
      filteredMetrics = filteredMetrics.filter(m => m.timestamp >= startTime);
    }
    
    if (endTime) {
      filteredMetrics = filteredMetrics.filter(m => m.timestamp <= endTime);
    }
    
    // Sort by timestamp descending and limit
    filteredMetrics = filteredMetrics
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
    
    metricsCounter.inc({ method: 'GET', status: 'success' });
    
    timer();
    
    return {
      success: true,
      metrics: filteredMetrics
    };
  } catch (error) {
    metricsCounter.inc({ method: 'GET', status: 'error' });
    timer();
    
    logger.error('Get metrics error:', error);
    return reply.code(500).send({
      success: false,
      error: 'Internal server error'
    });
  }
});

fastify.get('/api/v1/metrics/services', {
  schema: {
    description: 'Get list of all services',
    tags: ['metrics'],
    response: {
      200: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          services: {
            type: 'array',
            items: { type: 'string' }
          }
        }
      }
    }
  }
}, async () => {
  const services = new Set<string>();
  
  for (const key of metricsStore.keys()) {
    const [service] = key.split('-');
    services.add(service);
  }
  
  return {
    success: true,
    services: Array.from(services)
  };
});

fastify.get('/api/v1/metrics/summary', {
  schema: {
    description: 'Get metrics summary',
    tags: ['metrics'],
    response: {
      200: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          summary: {
            type: 'object',
            properties: {
              totalMetrics: { type: 'number' },
              totalServices: { type: 'number' },
              totalMetricTypes: { type: 'number' },
              lastUpdate: { type: 'string' }
            }
          }
        }
      }
    }
  }
}, async () => {
  const services = new Set<string>();
  const metricTypes = new Set<string>();
  let totalMetrics = 0;
  let lastUpdate = 0;
  
  for (const [key, metrics] of metricsStore.entries()) {
    const [service, metric] = key.split('-');
    services.add(service);
    metricTypes.add(metric);
    totalMetrics += metrics.length;
    
    if (metrics.length > 0) {
      const latest = Math.max(...metrics.map(m => m.timestamp));
      lastUpdate = Math.max(lastUpdate, latest);
    }
  }
  
  return {
    success: true,
    summary: {
      totalMetrics,
      totalServices: services.size,
      totalMetricTypes: metricTypes.size,
      lastUpdate: new Date(lastUpdate).toISOString()
    }
  };
});

// Health check
fastify.get('/health', {
  schema: {
    description: 'Health check endpoint',
    tags: ['health'],
    response: {
      200: {
        type: 'object',
        properties: {
          status: { type: 'string' },
          timestamp: { type: 'string' },
          service: { type: 'string' },
          version: { type: 'string' },
          kafka: { type: 'string' }
        }
      }
    }
  }
}, async () => {
  return {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'metrics-service',
    version: '1.0.0',
    kafka: 'connected'
  };
});

// Prometheus metrics endpoint
fastify.get('/metrics', {
  schema: {
    description: 'Prometheus metrics endpoint',
    tags: ['metrics']
  }
}, async () => {
  return register.metrics();
});

// Kafka consumer for processing metrics
const startKafkaConsumer = async () => {
  try {
    await consumer.connect();
    await consumer.subscribe({ topic: 'metrics', fromBeginning: false });
    
    await consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        try {
          const metric = JSON.parse(message.value!.toString());
          logger.info(`Processed metric from Kafka: ${metric.service}-${metric.metric}`);
        } catch (error) {
          logger.error('Kafka message processing error:', error);
        }
      }
    });
    
    logger.info('Kafka consumer started');
  } catch (error) {
    logger.error('Failed to start Kafka consumer:', error);
  }
};

// Start server
const start = async () => {
  try {
    // Connect to Kafka
    await producer.connect();
    logger.info('Connected to Kafka producer');
    
    // Start Kafka consumer
    await startKafkaConsumer();
    
    const port = parseInt(process.env.PORT || '3002');
    const host = process.env.HOST || '0.0.0.0';
    
    await fastify.listen({ port, host });
    logger.info(`🚀 Metrics Service running on http://${host}:${port}`);
    logger.info(`📚 API Documentation available at http://${host}:${port}/docs`);
  } catch (err) {
    logger.error('Failed to start server:', err);
    process.exit(1);
  }
};

start();
