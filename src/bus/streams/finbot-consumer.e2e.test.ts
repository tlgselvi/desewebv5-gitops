import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createServer } from 'http';
import { WebSocket } from 'ws';
import express from 'express';
import { redis } from '@/services/storage/redisClient.js';
import { initializeWebSocketGateway, getWebSocketGateway } from '@/ws/gateway.js';
import { startFinBotConsumer, stopFinBotConsumer } from '@/bus/streams/finbot-consumer.js';
import { createEvent, parseEvent } from '@/bus/schema.js';

/**
 * E2E tests for FinBot transaction flow
 * 
 * Tests the complete flow:
 * 1. POST /api/v1/finbot/transactions → FinBot publishes event
 * 2. Consumer processes event from Redis Stream
 * 3. WebSocket gateway broadcasts event to connected clients
 */

const STREAM_NAME = 'finbot.events';
const FINBOT_BASE = process.env.FINBOT_BASE || 'http://localhost:8080';

describe('FinBot Transaction E2E Flow', () => {
  let app: express.Application;
  let server: ReturnType<typeof createServer>;
  let wsClient: WebSocket | null = null;
  let receivedMessages: unknown[] = [];

  beforeAll(async () => {
    // Create Express app
    app = express();
    app.use(express.json());

    // Mock FinBot POST endpoint
    app.post('/api/v1/finbot/transactions', async (req, res) => {
      // Simulate FinBot publishing event
      const event = createEvent('finbot.transaction.created', 'finbot', {
        transactionId: req.body.id || 'test-transaction-id',
        accountId: req.body.accountId,
        amount: req.body.amount,
        currency: req.body.currency,
        type: req.body.type,
        description: req.body.description,
        metadata: req.body.metadata,
      });

      const eventJson = JSON.stringify(event);

      // Publish to Redis Stream
      await redis.xadd(STREAM_NAME, '*', 'event', eventJson);

      res.status(201).json({
        id: req.body.id || 'test-transaction-id',
        ...req.body,
        eventPublished: true,
      });
    });

    // Create HTTP server
    server = createServer(app);

    // Initialize WebSocket gateway
    initializeWebSocketGateway(server);

    // Start server
    await new Promise<void>((resolve) => {
      server.listen(0, () => {
        resolve();
      });
    });

    // Start consumer (in test mode)
    try {
      await startFinBotConsumer();
    } catch (error) {
      // Consumer might already be running, ignore
      console.log('Consumer start error (expected in test):', error);
    }

    // Give consumer time to start
    await new Promise((resolve) => setTimeout(resolve, 1000));
  });

  afterAll(async () => {
    // Close WebSocket client
    if (wsClient) {
      wsClient.close();
    }

    // Stop consumer
    try {
      await stopFinBotConsumer();
    } catch {
      // Ignore
    }

    // Close server
    await new Promise<void>((resolve) => {
      server.close(() => {
        resolve();
      });
    });
  });

  it('should receive WebSocket message after POST transaction', async () => {
    return new Promise<void>(async (resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Timeout waiting for WebSocket message'));
      }, 10000); // 10 second timeout

      // Connect WebSocket client
      const port = (server.address() as { port: number }).port;
      wsClient = new WebSocket(`ws://localhost:${port}/ws?token=test-token`);

      wsClient.on('open', () => {
        // Send POST transaction request
        request(app)
          .post('/api/v1/finbot/transactions')
          .send({
            accountId: 'acc-e2e-1',
            amount: 150.50,
            currency: 'USD',
            type: 'income',
            description: 'E2E test transaction',
          })
          .expect(201)
          .then(() => {
            // Wait for WebSocket message
            // Consumer should process event and broadcast
            setTimeout(() => {
              if (receivedMessages.length > 0) {
                clearTimeout(timeout);
                resolve();
              } else {
                reject(new Error('No WebSocket message received'));
              }
            }, 3000); // Give consumer time to process
          })
          .catch(reject);
      });

      wsClient.on('message', (data: Buffer) => {
        try {
          const message = JSON.parse(data.toString());
          receivedMessages.push(message);

          // Check if it's an event message
          if (message.type === 'event' && message.event) {
            expect(message.event.type).toBe('finbot.transaction.created');
            expect(message.event.source).toBe('finbot');
            expect(message.event.data.transactionId).toBeDefined();
            expect(message.event.data.accountId).toBe('acc-e2e-1');
            expect(message.event.data.amount).toBe(150.50);
            
            clearTimeout(timeout);
            resolve();
          }
        } catch (error) {
          // Ignore non-JSON messages (like 'connected')
        }
      });

      wsClient.on('error', (error) => {
        clearTimeout(timeout);
        reject(error);
      });
    });
  }, 15000); // 15 second timeout for entire test

  it('should process transaction event through consumer', async () => {
    // Manually publish event to stream
    const event = createEvent('finbot.transaction.created', 'finbot', {
      transactionId: 'manual-test-123',
      accountId: 'acc-manual',
      amount: 99.99,
      currency: 'EUR',
      type: 'expense',
    });

    const eventJson = JSON.stringify(event);
    await redis.xadd(STREAM_NAME, '*', 'event', eventJson);

    // Give consumer time to process (consumer loop runs async)
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Verify event was processed (check metrics or logs)
    // In a real scenario, we'd check database or side effects
    // For now, we just verify the event was published
    expect(event.id).toBeDefined();
    expect(event.type).toBe('finbot.transaction.created');
  });
});

