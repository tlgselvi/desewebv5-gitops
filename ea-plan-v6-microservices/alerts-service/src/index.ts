import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import { Kafka } from 'kafkajs';
import nodemailer from 'nodemailer';
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
      title: 'EA Plan v6.0 Alerts Service',
      description: 'Alert Management and Notifications Service',
      version: '1.0.0'
    },
    host: 'localhost:3004',
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
  clientId: 'alerts-service',
  brokers: [process.env.KAFKA_BROKER || 'localhost:9092'],
  retry: {
    initialRetryTime: 100,
    retries: 8
  }
});

const producer = kafka.producer();
const consumer = kafka.consumer({ groupId: 'alerts-processing-group' });

// Email transporter (in production, configure with real SMTP)
const emailTransporter = nodemailer.createTransporter({
  host: process.env.SMTP_HOST || 'localhost',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.SMTP_USER || 'alerts@ea-plan-v6.local',
    pass: process.env.SMTP_PASS || 'password'
  }
});

// Schemas
const AlertSchema = z.object({
  id: z.string().optional(),
  title: z.string(),
  description: z.string(),
  severity: z.enum(['low', 'medium', 'high', 'critical']),
  source: z.string(),
  service: z.string(),
  timestamp: z.number().optional(),
  metadata: z.record(z.any()).optional()
});

const AlertRuleSchema = z.object({
  id: z.string().optional(),
  name: z.string(),
  condition: z.string(),
  severity: z.enum(['low', 'medium', 'high', 'critical']),
  enabled: z.boolean().default(true),
  notifications: z.array(z.string()).default(['email'])
});

// In-memory stores (in production, use PostgreSQL)
const alertsStore = new Map<string, any>();
const alertRulesStore = new Map<string, any>();

// Routes
fastify.post('/api/v1/alerts', {
  schema: {
    description: 'Create a new alert',
    tags: ['alerts'],
    body: {
      type: 'object',
      required: ['title', 'description', 'severity', 'source', 'service'],
      properties: {
        title: { type: 'string' },
        description: { type: 'string' },
        severity: { type: 'string', enum: ['low', 'medium', 'high', 'critical'] },
        source: { type: 'string' },
        service: { type: 'string' },
        timestamp: { type: 'number' },
        metadata: { type: 'object' }
      }
    },
    response: {
      201: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          alert: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              title: { type: 'string' },
              description: { type: 'string' },
              severity: { type: 'string' },
              source: { type: 'string' },
              service: { type: 'string' },
              timestamp: { type: 'number' },
              status: { type: 'string' }
            }
          }
        }
      }
    }
  }
}, async (request, reply) => {
  try {
    const alertData = AlertSchema.parse(request.body);
    
    const alertId = alertData.id || `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const timestamp = alertData.timestamp || Date.now();
    
    const alert = {
      id: alertId,
      title: alertData.title,
      description: alertData.description,
      severity: alertData.severity,
      source: alertData.source,
      service: alertData.service,
      timestamp,
      metadata: alertData.metadata || {},
      status: 'open',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    alertsStore.set(alertId, alert);
    
    // Send to Kafka for further processing
    await producer.send({
      topic: 'alerts',
      messages: [{
        key: alertId,
        value: JSON.stringify(alert),
        timestamp: timestamp.toString()
      }]
    });
    
    // Send notifications
    await sendNotifications(alert);
    
    logger.info(`Created alert: ${alertId} - ${alert.title}`);
    
    return reply.code(201).send({
      success: true,
      alert
    });
  } catch (error) {
    logger.error('Alert creation error:', error);
    return reply.code(400).send({
      success: false,
      error: 'Invalid alert data'
    });
  }
});

fastify.get('/api/v1/alerts', {
  schema: {
    description: 'Get all alerts',
    tags: ['alerts'],
    querystring: {
      type: 'object',
      properties: {
        status: { type: 'string', enum: ['open', 'acknowledged', 'resolved'] },
        severity: { type: 'string', enum: ['low', 'medium', 'high', 'critical'] },
        service: { type: 'string' },
        limit: { type: 'number', default: 100 },
        offset: { type: 'number', default: 0 }
      }
    },
    response: {
      200: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          alerts: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                title: { type: 'string' },
                description: { type: 'string' },
                severity: { type: 'string' },
                source: { type: 'string' },
                service: { type: 'string' },
                timestamp: { type: 'number' },
                status: { type: 'string' },
                createdAt: { type: 'string' }
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
    const { status, severity, service, limit = 100, offset = 0 } = request.query as any;
    
    let alerts = Array.from(alertsStore.values());
    
    // Apply filters
    if (status) {
      alerts = alerts.filter(alert => alert.status === status);
    }
    
    if (severity) {
      alerts = alerts.filter(alert => alert.severity === severity);
    }
    
    if (service) {
      alerts = alerts.filter(alert => alert.service === service);
    }
    
    // Sort by timestamp descending
    alerts = alerts.sort((a, b) => b.timestamp - a.timestamp);
    
    const total = alerts.length;
    const paginatedAlerts = alerts.slice(offset, offset + limit);
    
    return {
      success: true,
      alerts: paginatedAlerts,
      total
    };
  } catch (error) {
    logger.error('Get alerts error:', error);
    return reply.code(500).send({
      success: false,
      error: 'Internal server error'
    });
  }
});

fastify.put('/api/v1/alerts/:id/status', {
  schema: {
    description: 'Update alert status',
    tags: ['alerts'],
    params: {
      type: 'object',
      required: ['id'],
      properties: {
        id: { type: 'string' }
      }
    },
    body: {
      type: 'object',
      required: ['status'],
      properties: {
        status: { type: 'string', enum: ['open', 'acknowledged', 'resolved'] },
        comment: { type: 'string' }
      }
    },
    response: {
      200: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          alert: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              status: { type: 'string' },
              updatedAt: { type: 'string' }
            }
          }
        }
      }
    }
  }
}, async (request, reply) => {
  try {
    const { id } = request.params as { id: string };
    const { status, comment } = request.body as { status: string; comment?: string };
    
    const alert = alertsStore.get(id);
    if (!alert) {
      return reply.code(404).send({
        success: false,
        error: 'Alert not found'
      });
    }
    
    alert.status = status;
    alert.updatedAt = new Date().toISOString();
    
    if (comment) {
      alert.comment = comment;
    }
    
    alertsStore.set(id, alert);
    
    logger.info(`Updated alert ${id} status to ${status}`);
    
    return {
      success: true,
      alert: {
        id: alert.id,
        status: alert.status,
        updatedAt: alert.updatedAt
      }
    };
  } catch (error) {
    logger.error('Update alert error:', error);
    return reply.code(500).send({
      success: false,
      error: 'Internal server error'
    });
  }
});

fastify.post('/api/v1/alerts/rules', {
  schema: {
    description: 'Create alert rule',
    tags: ['rules'],
    body: {
      type: 'object',
      required: ['name', 'condition', 'severity'],
      properties: {
        name: { type: 'string' },
        condition: { type: 'string' },
        severity: { type: 'string', enum: ['low', 'medium', 'high', 'critical'] },
        enabled: { type: 'boolean' },
        notifications: { type: 'array', items: { type: 'string' } }
      }
    },
    response: {
      201: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          rule: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              name: { type: 'string' },
              condition: { type: 'string' },
              severity: { type: 'string' },
              enabled: { type: 'boolean' },
              notifications: { type: 'array', items: { type: 'string' } }
            }
          }
        }
      }
    }
  }
}, async (request, reply) => {
  try {
    const ruleData = AlertRuleSchema.parse(request.body);
    
    const ruleId = ruleData.id || `rule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const rule = {
      id: ruleId,
      name: ruleData.name,
      condition: ruleData.condition,
      severity: ruleData.severity,
      enabled: ruleData.enabled,
      notifications: ruleData.notifications,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    alertRulesStore.set(ruleId, rule);
    
    logger.info(`Created alert rule: ${ruleId} - ${rule.name}`);
    
    return reply.code(201).send({
      success: true,
      rule
    });
  } catch (error) {
    logger.error('Alert rule creation error:', error);
    return reply.code(400).send({
      success: false,
      error: 'Invalid rule data'
    });
  }
});

// Helper function to send notifications
async function sendNotifications(alert: any) {
  try {
    // Email notification
    if (alert.severity === 'critical' || alert.severity === 'high') {
      const mailOptions = {
        from: process.env.SMTP_FROM || 'alerts@ea-plan-v6.local',
        to: process.env.ALERT_EMAIL || 'admin@ea-plan-v6.local',
        subject: `[${alert.severity.toUpperCase()}] ${alert.title}`,
        html: `
          <h2>Alert: ${alert.title}</h2>
          <p><strong>Service:</strong> ${alert.service}</p>
          <p><strong>Source:</strong> ${alert.source}</p>
          <p><strong>Severity:</strong> ${alert.severity}</p>
          <p><strong>Description:</strong> ${alert.description}</p>
          <p><strong>Time:</strong> ${new Date(alert.timestamp).toISOString()}</p>
        `
      };
      
      await emailTransporter.sendMail(mailOptions);
      logger.info(`Email notification sent for alert: ${alert.id}`);
    }
    
    // Slack notification (placeholder)
    if (process.env.SLACK_WEBHOOK_URL) {
      // In production, implement Slack webhook
      logger.info(`Slack notification would be sent for alert: ${alert.id}`);
    }
    
  } catch (error) {
    logger.error('Notification sending error:', error);
  }
}

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
    service: 'alerts-service',
    version: '1.0.0',
    kafka: 'connected'
  };
});

// Kafka consumer for processing alerts
const startKafkaConsumer = async () => {
  try {
    await consumer.connect();
    await consumer.subscribe({ topic: 'alerts', fromBeginning: false });
    
    await consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        try {
          const alert = JSON.parse(message.value!.toString());
          logger.info(`Processed alert from Kafka: ${alert.id} - ${alert.title}`);
        } catch (error) {
          logger.error('Kafka alert processing error:', error);
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
    
    const port = parseInt(process.env.PORT || '3004');
    const host = process.env.HOST || '0.0.0.0';
    
    await fastify.listen({ port, host });
    logger.info(`🚀 Alerts Service running on http://${host}:${port}`);
    logger.info(`📚 API Documentation available at http://${host}:${port}/docs`);
  } catch (err) {
    logger.error('Failed to start server:', err);
    process.exit(1);
  }
};

start();
