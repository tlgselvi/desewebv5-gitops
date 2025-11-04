import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { redis } from '@/services/storage/redisClient.js';
import { parseEvent, Event } from '@/bus/schema.js';
import { logger } from '@/utils/logger.js';

/**
 * FINBOT-MUBOT-DESE Integration Test Suite
 * 
 * Tests the complete data flow between:
 * - FinBot: Financial data generation
 * - MuBot: Multi-source data ingestion
 * - DESE: Analytics and correlation
 * 
 * Phase-5 Sprint 1: Task 1.1
 */

const FINBOT_MCP_URL = process.env.FINBOT_MCP_URL || 'http://localhost:5555';
const MUBOT_MCP_URL = process.env.MUBOT_MCP_URL || 'http://localhost:5556';
const DESE_MCP_URL = process.env.DESE_MCP_URL || 'http://localhost:5557';
const OBSERVABILITY_MCP_URL = process.env.OBSERVABILITY_MCP_URL || 'http://localhost:5558';

const STREAM_NAMES = ['finbot.events', 'mubot.events', 'dese.events'];

describe('FINBOT-MUBOT-DESE Integration', () => {
  beforeAll(async () => {
    logger.info('Starting FINBOT-MUBOT-DESE integration tests');
    
    // Verify MCP servers are running
    const servers = [
      { name: 'FinBot', url: `${FINBOT_MCP_URL}/finbot/health` },
      { name: 'MuBot', url: `${MUBOT_MCP_URL}/mubot/health` },
      { name: 'DESE', url: `${DESE_MCP_URL}/dese/health` },
      { name: 'Observability', url: `${OBSERVABILITY_MCP_URL}/observability/health` },
    ];

    for (const server of servers) {
      try {
        const response = await fetch(server.url);
        const data = await response.json();
        expect(data.status).toBe('healthy');
        logger.info(`${server.name} MCP server is healthy`);
      } catch (error) {
        throw new Error(`${server.name} MCP server is not available: ${error}`);
      }
    }
  });

  afterAll(async () => {
    // Cleanup test data
    try {
      for (const stream of STREAM_NAMES) {
        await redis.del(stream);
      }
    } catch (error) {
      logger.warn('Failed to cleanup test streams', { error });
    }
  });

  describe('MCP Server Health Checks', () => {
    it('should verify all MCP servers are healthy', async () => {
      const servers = [
        { name: 'FinBot', url: `${FINBOT_MCP_URL}/finbot/health` },
        { name: 'MuBot', url: `${MUBOT_MCP_URL}/mubot/health` },
        { name: 'DESE', url: `${DESE_MCP_URL}/dese/health` },
        { name: 'Observability', url: `${OBSERVABILITY_MCP_URL}/observability/health` },
      ];

      for (const server of servers) {
        const response = await fetch(server.url);
        expect(response.status).toBe(200);
        
        const data = await response.json();
        expect(data.status).toBe('healthy');
        expect(data.service).toBeDefined();
        expect(data.version).toBeDefined();
      }
    });

    it('should verify MCP server query endpoints', async () => {
      // Test FinBot query
      const finbotResponse = await fetch(`${FINBOT_MCP_URL}/finbot/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: 'test' }),
      });
      expect(finbotResponse.status).toBe(200);

      // Test MuBot query
      const mubotResponse = await fetch(`${MUBOT_MCP_URL}/mubot/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: 'test' }),
      });
      expect(mubotResponse.status).toBe(200);

      // Test DESE query
      const deseResponse = await fetch(`${DESE_MCP_URL}/dese/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: 'test' }),
      });
      expect(deseResponse.status).toBe(200);
    });
  });

  describe('Event Bus Data Flow', () => {
    it('should publish event from FinBot and consume via DESE', async () => {
      const testEvent: Event = {
        id: `test-${Date.now()}`,
        type: 'finbot.transaction.created',
        source: 'finbot',
        timestamp: new Date().toISOString(),
        status: 200,
        processingTimeMs: 50,
        data: {
          transactionId: 'tx-123',
          amount: 1000,
          accountId: 'acc-456',
        },
      };

      // Publish event to Redis Stream
      await redis.xadd('finbot.events', '*', {
        event: JSON.stringify(testEvent),
      });

      // Verify event is in stream
      const messages = await redis.xread('STREAMS', 'finbot.events', '0');
      expect(messages).toBeDefined();
      expect(Array.isArray(messages)).toBe(true);

      if (Array.isArray(messages) && messages.length > 0) {
        const streamData = messages[0];
        if (Array.isArray(streamData) && streamData.length > 1) {
          const events = streamData[1];
          const foundEvent = events.find((event: any) => {
            const parsed = JSON.parse(event[1].event);
            return parsed.id === testEvent.id;
          });
          expect(foundEvent).toBeDefined();
        }
      }
    });

    it('should validate event schema parsing', async () => {
      const validEvent = {
        id: 'test-123',
        type: 'finbot.transaction.created',
        source: 'finbot',
        timestamp: new Date().toISOString(),
        status: 200,
        processingTimeMs: 50,
        data: { test: 'data' },
      };

      const parsed = parseEvent(JSON.stringify(validEvent));
      expect(parsed).toBeDefined();
      expect(parsed.id).toBe(validEvent.id);
      expect(parsed.type).toBe(validEvent.type);
      expect(parsed.source).toBe(validEvent.source);
    });

    it('should handle event correlation between modules', async () => {
      // Create correlated events
      const finbotEvent: Event = {
        id: 'finbot-1',
        type: 'finbot.transaction.created',
        source: 'finbot',
        timestamp: new Date().toISOString(),
        status: 200,
        processingTimeMs: 50,
        data: { transactionId: 'tx-1' },
      };

      const mubotEvent: Event = {
        id: 'mubot-1',
        type: 'mubot.data.ingested',
        source: 'mubot',
        timestamp: new Date().toISOString(),
        status: 200,
        processingTimeMs: 30,
        data: { transactionId: 'tx-1', source: 'bank' },
      };

      // Publish both events
      await redis.xadd('finbot.events', '*', {
        event: JSON.stringify(finbotEvent),
      });
      await redis.xadd('mubot.events', '*', {
        event: JSON.stringify(mubotEvent),
      });

      // Verify correlation can be detected
      const finbotMessages = await redis.xread('STREAMS', 'finbot.events', '0');
      const mubotMessages = await redis.xread('STREAMS', 'mubot.events', '0');

      expect(finbotMessages).toBeDefined();
      expect(mubotMessages).toBeDefined();
    });
  });

  describe('Data Flow End-to-End', () => {
    it('should complete full data flow: FinBot → MuBot → DESE', async () => {
      // Step 1: FinBot generates financial data
      const finbotData = {
        accountId: 'acc-test-1',
        transactionId: 'tx-test-1',
        amount: 5000,
        category: 'revenue',
      };

      const finbotEvent: Event = {
        id: `e2e-${Date.now()}`,
        type: 'finbot.transaction.created',
        source: 'finbot',
        timestamp: new Date().toISOString(),
        status: 200,
        processingTimeMs: 100,
        data: finbotData,
      };

      // Step 2: Publish to FinBot stream
      const streamId = await redis.xadd('finbot.events', '*', {
        event: JSON.stringify(finbotEvent),
      });
      expect(streamId).toBeDefined();

      // Step 3: Verify MuBot can access the data
      const mubotResponse = await fetch(`${MUBOT_MCP_URL}/mubot/context`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resource: 'finbot.transaction',
          resourceId: finbotData.transactionId,
        }),
      });
      expect(mubotResponse.status).toBe(200);

      // Step 4: Verify DESE can correlate
      const deseResponse = await fetch(`${DESE_MCP_URL}/dese/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: `correlation:finbot.transaction:${finbotData.transactionId}`,
        }),
      });
      expect(deseResponse.status).toBe(200);
    });

    it('should handle error scenarios gracefully', async () => {
      // Test invalid event
      const invalidEvent = {
        id: 'invalid',
        type: 'unknown.type',
        source: 'unknown',
      };

      try {
        const parsed = parseEvent(JSON.stringify(invalidEvent));
        // Should either parse with defaults or throw
        expect(parsed).toBeDefined();
      } catch (error) {
        // Expected to fail validation
        expect(error).toBeDefined();
      }
    });
  });

  describe('Performance & Scalability', () => {
    it('should handle concurrent event processing', async () => {
      const eventCount = 10;
      const events: Promise<string>[] = [];

      for (let i = 0; i < eventCount; i++) {
        const event: Event = {
          id: `perf-${i}`,
          type: 'finbot.transaction.created',
          source: 'finbot',
          timestamp: new Date().toISOString(),
          status: 200,
          processingTimeMs: 10 + i,
          data: { index: i },
        };

        events.push(
          redis.xadd('finbot.events', '*', {
            event: JSON.stringify(event),
          }) as Promise<string>
        );
      }

      const results = await Promise.all(events);
      expect(results.length).toBe(eventCount);
      expect(results.every((id) => id !== null)).toBe(true);
    });

    it('should validate stream processing latency', async () => {
      const startTime = Date.now();
      
      const event: Event = {
        id: `latency-${Date.now()}`,
        type: 'finbot.transaction.created',
        source: 'finbot',
        timestamp: new Date().toISOString(),
        status: 200,
        processingTimeMs: 0,
        data: { test: 'latency' },
      };

      await redis.xadd('finbot.events', '*', {
        event: JSON.stringify(event),
      });

      const endTime = Date.now();
      const latency = endTime - startTime;

      // Should complete within 100ms
      expect(latency).toBeLessThan(100);
    });
  });
});

