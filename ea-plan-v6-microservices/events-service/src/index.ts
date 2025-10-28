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
      title: 'EA Plan v6.0 Events Service',
      description: 'Event Streaming and Processing Service',
      version: '1.0.0'
    },
    host: 'localhost:3003',
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
  clientId: 'events-service',
  brokers: [process.env.KAFKA_BROKER || 'localhost:9092'],
  retry: {
    initialRetryTime: 100,
    retries: 8
  }
});

const producer = kafka.producer();
const consumer = kafka.consumer({ groupId: 'events-processing-group' });

// Schemas
const EventSchema = z.object({
  id: z.string().optional(),
  type: z.string(),
  source: z.string(),
  timestamp: z.number().optional(),
  data: z.record(z.any()),
  metadata: z.record(z.string()).optional()
});

const EventsBatchSchema = z.object({
  events: z.array(EventSchema)
});

// In-memory event store (in production, use event store like EventStore)
const eventStore = new Map<string, any[]>();

// Routes
fastify.post('/api/v1/events', {
  schema: {
    description: 'Publish events',
    tags: ['events'],
    body: {
      type: 'object',
      required: ['events'],
      properties: {
        events: {
          type: 'array',
          items: {
            type: 'object',
            required: ['type', 'source', 'data'],
            properties: {
              id: { type: 'string' },
              type: { type: 'string' },
              source: { type: 'string' },
              timestamp: { type: 'number' },
              data: { type: 'object' },
              metadata: { type: 'object' }
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
          published: { type: 'number' },
          message: { type: 'string' }
        }
      }
    }
  }
}, async (request, reply) => {
  try {
    const { events } = EventsBatchSchema.parse(request.body);
    
    const publishedEvents = [];
    
    for (const event of events) {
      const eventId = event.id || `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const timestamp = event.timestamp || Date.now();
      
      const enrichedEvent = {
        id: eventId,
        type: event.type,
        source: event.source,
        timestamp,
        data: event.data,
        metadata: {
          ...event.metadata,
          publishedAt: new Date().toISOString(),
          version: '1.0'
        }
      };
      
      // Store in local event store
      if (!eventStore.has(event.type)) {
        eventStore.set(event.type, []);
      }
      
      const eventsOfType = eventStore.get(event.type)!;
      eventsOfType.push(enrichedEvent);
      
      // Keep only last 1000 events per type
      if (eventsOfType.length > 1000) {
        eventsOfType.splice(0, eventsOfType.length - 1000);
      }
      
      // Send to Kafka
      await producer.send({
        topic: 'events',
        messages: [{
          key: eventId,
          value: JSON.stringify(enrichedEvent),
          timestamp: timestamp.toString()
        }]
      });
      
      publishedEvents.push(enrichedEvent);
    }
    
    logger.info(`Published ${publishedEvents.length} events`);
    
    return {
      success: true,
      published: publishedEvents.length,
      message: 'Events published successfully'
    };
  } catch (error) {
    logger.error('Event publishing error:', error);
    return reply.code(400).send({
      success: false,
      error: 'Invalid event data'
    });
  }
});

fastify.get('/api/v1/events/:type', {
  schema: {
    description: 'Get events by type',
    tags: ['events'],
    params: {
      type: 'object',
      required: ['type'],
      properties: {
        type: { type: 'string' }
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
          events: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                type: { type: 'string' },
                source: { type: 'string' },
                timestamp: { type: 'number' },
                data: { type: 'object' },
                metadata: { type: 'object' }
              }
            }
          }
        }
      }
    }
  }
}, async (request, reply) => {
  try {
    const { type } = request.params as { type: string };
    const { limit = 100, startTime, endTime } = request.query as { limit?: number; startTime?: number; endTime?: number };
    
    const events = eventStore.get(type) || [];
    
    let filteredEvents = events;
    
    if (startTime) {
      filteredEvents = filteredEvents.filter(e => e.timestamp >= startTime);
    }
    
    if (endTime) {
      filteredEvents = filteredEvents.filter(e => e.timestamp <= endTime);
    }
    
    // Sort by timestamp descending and limit
    filteredEvents = filteredEvents
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
    
    return {
      success: true,
      events: filteredEvents
    };
  } catch (error) {
    logger.error('Get events error:', error);
    return reply.code(500).send({
      success: false,
      error: 'Internal server error'
    });
  }
});

fastify.get('/api/v1/events/types', {
  schema: {
    description: 'Get all event types',
    tags: ['events'],
    response: {
      200: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          types: {
            type: 'array',
            items: { type: 'string' }
          }
        }
      }
    }
  }
}, async () => {
  return {
    success: true,
    types: Array.from(eventStore.keys())
  };
});

fastify.get('/api/v1/events/summary', {
  schema: {
    description: 'Get events summary',
    tags: ['events'],
    response: {
      200: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          summary: {
            type: 'object',
            properties: {
              totalEvents: { type: 'number' },
              totalTypes: { type: 'number' },
              lastEvent: { type: 'string' }
            }
          }
        }
      }
    }
  }
}, async () => {
  let totalEvents = 0;
  let lastEventTime = 0;
  
  for (const events of eventStore.values()) {
    totalEvents += events.length;
    
    if (events.length > 0) {
      const latest = Math.max(...events.map(e => e.timestamp));
      lastEventTime = Math.max(lastEventTime, latest);
    }
  }
  
  return {
    success: true,
    summary: {
      totalEvents,
      totalTypes: eventStore.size,
      lastEvent: new Date(lastEventTime).toISOString()
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
    service: 'events-service',
    version: '1.0.0',
    kafka: 'connected'
  };
});

// Kafka consumer for processing events
const startKafkaConsumer = async () => {
  try {
    await consumer.connect();
    await consumer.subscribe({ topic: 'events', fromBeginning: false });
    
    await consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        try {
          const event = JSON.parse(message.value!.toString());
          logger.info(`Processed event from Kafka: ${event.type} from ${event.source}`);
        } catch (error) {
          logger.error('Kafka event processing error:', error);
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
    
    const port = parseInt(process.env.PORT || '3003');
    const host = process.env.HOST || '0.0.0.0';
    
    await fastify.listen({ port, host });
    logger.info(`🚀 Events Service running on http://${host}:${port}`);
    logger.info(`📚 API Documentation available at http://${host}:${port}/docs`);
  } catch (err) {
    logger.error('Failed to start server:', err);
    process.exit(1);
  }
};

start();
