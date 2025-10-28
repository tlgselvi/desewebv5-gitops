import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import { Kafka } from 'kafkajs';
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
      title: 'EA Plan v6.0 ML Service',
      description: 'Machine Learning and Anomaly Detection Service',
      version: '1.0.0'
    },
    host: 'localhost:3005',
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

// Kafka setup
const kafka = new Kafka({
  clientId: 'ml-service',
  brokers: [process.env.KAFKA_BROKER || 'localhost:9092'],
  retry: {
    initialRetryTime: 100,
    retries: 8
  }
});

const producer = kafka.producer();
const consumer = kafka.consumer({ groupId: 'ml-processing-group' });

// Schemas
const MetricSchema = z.object({
  timestamp: z.number(),
  service: z.string(),
  metric: z.string(),
  value: z.number(),
  tags: z.record(z.string()).optional()
});

const AnomalyResultSchema = z.object({
  id: z.string(),
  timestamp: z.number(),
  service: z.string(),
  metric: z.string(),
  value: z.number(),
  anomalyScore: z.number(),
  isAnomaly: z.boolean(),
  severity: z.enum(['low', 'medium', 'high', 'critical']),
  confidence: z.number(),
  metadata: z.record(z.any()).optional()
});

// In-memory stores for anomaly detection
const metricsHistory = new Map<string, number[]>();
const anomalyResults = new Map<string, any[]>();

// Anomaly detection algorithm (Z-score based)
function detectAnomaly(metric: any): any {
  const key = `${metric.service}-${metric.metric}`;
  
  // Get historical data
  if (!metricsHistory.has(key)) {
    metricsHistory.set(key, []);
  }
  
  const history = metricsHistory.get(key)!;
  history.push(metric.value);
  
  // Keep only last 100 data points
  if (history.length > 100) {
    history.splice(0, history.length - 100);
  }
  
  // Need at least 10 data points for reliable detection
  if (history.length < 10) {
    return {
      id: `anomaly_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: metric.timestamp,
      service: metric.service,
      metric: metric.metric,
      value: metric.value,
      anomalyScore: 0,
      isAnomaly: false,
      severity: 'low',
      confidence: 0.5,
      metadata: { reason: 'Insufficient data for anomaly detection' }
    };
  }
  
  // Calculate Z-score
  const mean = history.reduce((sum, val) => sum + val, 0) / history.length;
  const variance = history.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / history.length;
  const stdDev = Math.sqrt(variance);
  
  if (stdDev === 0) {
    return {
      id: `anomaly_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: metric.timestamp,
      service: metric.service,
      metric: metric.metric,
      value: metric.value,
      anomalyScore: 0,
      isAnomaly: false,
      severity: 'low',
      confidence: 0.5,
      metadata: { reason: 'No variance in data' }
    };
  }
  
  const zScore = Math.abs((metric.value - mean) / stdDev);
  const anomalyScore = Math.min(zScore / 3, 1); // Normalize to 0-1
  const isAnomaly = zScore > 2; // 2-sigma threshold
  
  let severity: 'low' | 'medium' | 'high' | 'critical';
  if (zScore > 4) severity = 'critical';
  else if (zScore > 3) severity = 'high';
  else if (zScore > 2) severity = 'medium';
  else severity = 'low';
  
  const confidence = Math.min(zScore / 2, 1); // Confidence based on Z-score
  
  return {
    id: `anomaly_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    timestamp: metric.timestamp,
    service: metric.service,
    metric: metric.metric,
    value: metric.value,
    anomalyScore,
    isAnomaly,
    severity,
    confidence,
    metadata: {
      zScore,
      mean,
      stdDev,
      historyLength: history.length
    }
  };
}

// Routes
fastify.post('/api/v1/ml/detect', {
  schema: {
    description: 'Detect anomalies in metrics data',
    tags: ['ml'],
    body: {
      type: 'object',
      required: ['timestamp', 'service', 'metric', 'value'],
      properties: {
        timestamp: { type: 'number' },
        service: { type: 'string' },
        metric: { type: 'string' },
        value: { type: 'number' },
        tags: { type: 'object' }
      }
    },
    response: {
      200: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          result: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              timestamp: { type: 'number' },
              service: { type: 'string' },
              metric: { type: 'string' },
              value: { type: 'number' },
              anomalyScore: { type: 'number' },
              isAnomaly: { type: 'boolean' },
              severity: { type: 'string' },
              confidence: { type: 'number' },
              metadata: { type: 'object' }
            }
          }
        }
      }
    }
  }
}, async (request, reply) => {
  try {
    const metric = MetricSchema.parse(request.body);
    
    const result = detectAnomaly(metric);
    
    // Store result
    const key = `${metric.service}-${metric.metric}`;
    if (!anomalyResults.has(key)) {
      anomalyResults.set(key, []);
    }
    
    const results = anomalyResults.get(key)!;
    results.push(result);
    
    // Keep only last 100 results
    if (results.length > 100) {
      results.splice(0, results.length - 100);
    }
    
    // If anomaly detected, send to alerts topic
    if (result.isAnomaly) {
      await producer.send({
        topic: 'alerts',
        messages: [{
          key: result.id,
          value: JSON.stringify({
            id: result.id,
            title: `Anomaly detected in ${result.service}`,
            description: `Metric ${result.metric} shows anomalous value: ${result.value}`,
            severity: result.severity,
            source: 'ml-service',
            service: result.service,
            timestamp: result.timestamp,
            metadata: {
              anomalyScore: result.anomalyScore,
              confidence: result.confidence,
              metric: result.metric,
              value: result.value
            }
          })
        }]
      });
      
      logger.info(`Anomaly detected: ${result.id} - ${result.service}/${result.metric} (score: ${result.anomalyScore.toFixed(3)})`);
    }
    
    return {
      success: true,
      result
    };
  } catch (error) {
    logger.error('Anomaly detection error:', error);
    return reply.code(400).send({
      success: false,
      error: 'Invalid metric data'
    });
  }
});

fastify.get('/api/v1/ml/anomalies', {
  schema: {
    description: 'Get anomaly detection results',
    tags: ['ml'],
    querystring: {
      type: 'object',
      properties: {
        service: { type: 'string' },
        metric: { type: 'string' },
        severity: { type: 'string', enum: ['low', 'medium', 'high', 'critical'] },
        limit: { type: 'number', default: 100 },
        offset: { type: 'number', default: 0 }
      }
    },
    response: {
      200: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          anomalies: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                timestamp: { type: 'number' },
                service: { type: 'string' },
                metric: { type: 'string' },
                value: { type: 'number' },
                anomalyScore: { type: 'number' },
                isAnomaly: { type: 'boolean' },
                severity: { type: 'string' },
                confidence: { type: 'number' }
              }
            }
          },
          total: { type: 'number' }
        }
      }
    }
  }
}, async (request, reply) => {
  try {
    const { service, metric, severity, limit = 100, offset = 0 } = request.query as any;
    
    let allAnomalies: any[] = [];
    
    // Collect all anomalies
    for (const results of anomalyResults.values()) {
      allAnomalies = allAnomalies.concat(results);
    }
    
    // Apply filters
    if (service) {
      allAnomalies = allAnomalies.filter(a => a.service === service);
    }
    
    if (metric) {
      allAnomalies = allAnomalies.filter(a => a.metric === metric);
    }
    
    if (severity) {
      allAnomalies = allAnomalies.filter(a => a.severity === severity);
    }
    
    // Sort by timestamp descending
    allAnomalies = allAnomalies.sort((a, b) => b.timestamp - a.timestamp);
    
    const total = allAnomalies.length;
    const paginatedAnomalies = allAnomalies.slice(offset, offset + limit);
    
    return {
      success: true,
      anomalies: paginatedAnomalies,
      total
    };
  } catch (error) {
    logger.error('Get anomalies error:', error);
    return reply.code(500).send({
      success: false,
      error: 'Internal server error'
    });
  }
});

fastify.get('/api/v1/ml/stats', {
  schema: {
    description: 'Get ML service statistics',
    tags: ['ml'],
    response: {
      200: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          stats: {
            type: 'object',
            properties: {
              totalMetrics: { type: 'number' },
              totalAnomalies: { type: 'number' },
              anomalyRate: { type: 'number' },
              services: { type: 'array', items: { type: 'string' } },
              metrics: { type: 'array', items: { type: 'string' } }
            }
          }
        }
      }
    }
  }
}, async () => {
  const services = new Set<string>();
  const metrics = new Set<string>();
  let totalMetrics = 0;
  let totalAnomalies = 0;
  
  // Collect statistics
  for (const [key, history] of metricsHistory.entries()) {
    const [service, metric] = key.split('-');
    services.add(service);
    metrics.add(metric);
    totalMetrics += history.length;
  }
  
  for (const results of anomalyResults.values()) {
    totalAnomalies += results.length;
  }
  
  const anomalyRate = totalMetrics > 0 ? (totalAnomalies / totalMetrics) * 100 : 0;
  
  return {
    success: true,
    stats: {
      totalMetrics,
      totalAnomalies,
      anomalyRate: parseFloat(anomalyRate.toFixed(2)),
      services: Array.from(services),
      metrics: Array.from(metrics)
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
    service: 'ml-service',
    version: '1.0.0',
    kafka: 'connected'
  };
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
          const result = detectAnomaly(metric);
          
          if (result.isAnomaly) {
            // Send to alerts topic
            await producer.send({
              topic: 'alerts',
              messages: [{
                key: result.id,
                value: JSON.stringify({
                  id: result.id,
                  title: `Anomaly detected in ${result.service}`,
                  description: `Metric ${result.metric} shows anomalous value: ${result.value}`,
                  severity: result.severity,
                  source: 'ml-service',
                  service: result.service,
                  timestamp: result.timestamp,
                  metadata: {
                    anomalyScore: result.anomalyScore,
                    confidence: result.confidence,
                    metric: result.metric,
                    value: result.value
                  }
                })
              }]
            });
            
            logger.info(`Anomaly detected from Kafka: ${result.id} - ${result.service}/${result.metric}`);
          }
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
    
    const port = parseInt(process.env.PORT || '3005');
    const host = process.env.HOST || '0.0.0.0';
    
    await fastify.listen({ port, host });
    logger.info(`🚀 ML Service running on http://${host}:${port}`);
    logger.info(`📚 API Documentation available at http://${host}:${port}/docs`);
  } catch (err) {
    logger.error('Failed to start server:', err);
    process.exit(1);
  }
};

start();
