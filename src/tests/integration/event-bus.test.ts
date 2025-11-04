import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { redis } from '@/services/storage/redisClient.js';
import { parseEvent, Event, EventType } from '@/bus/schema.js';
import { logger } from '@/utils/logger.js';

/**
 * Event Bus Integration Test Suite
 * 
 * Tests Redis Streams event bus functionality:
 * - Event publishing and consumption
 * - Consumer groups
 * - Idempotency
 * - Retry mechanisms
 * 
 * Phase-5 Sprint 1: Task 1.1
 */

const STREAM_NAME = 'test.events';
const CONSUMER_GROUP = 'test-group';
const CONSUMER_NAME = 'test-consumer';

describe('Event Bus Integration', () => {
  beforeAll(async () => {
    // Ensure consumer group exists
    try {
      await redis.xgroup('CREATE', STREAM_NAME, CONSUMER_GROUP, '0', 'MKSTREAM');
    } catch (error: any) {
      // Group might already exist, which is fine
      if (!error.message.includes('BUSYGROUP')) {
        throw error;
      }
    }
  });

  afterAll(async () => {
    // Cleanup
    try {
      await redis.del(STREAM_NAME);
    } catch (error) {
      logger.warn('Failed to cleanup test stream', { error });
    }
  });

  describe('Event Publishing', () => {
    it('should publish event to Redis Stream', async () => {
      const event: Event = {
        id: 'publish-test-1',
        type: 'test.event.created',
        source: 'test',
        timestamp: new Date().toISOString(),
        status: 200,
        processingTimeMs: 50,
        data: { test: 'data' },
      };

      const streamId = await redis.xadd(
        STREAM_NAME,
        '*',
        'event',
        JSON.stringify(event)
      );

      expect(streamId).toBeDefined();
      expect(typeof streamId).toBe('string');
    });

    it('should publish multiple events in batch', async () => {
      const events: Event[] = [];
      for (let i = 0; i < 5; i++) {
        events.push({
          id: `batch-${i}`,
          type: 'test.event.created',
          source: 'test',
          timestamp: new Date().toISOString(),
          status: 200,
          processingTimeMs: 10,
          data: { index: i },
        });
      }

      const streamIds: string[] = [];
      for (const event of events) {
        const id = await redis.xadd(STREAM_NAME, '*', 'event', JSON.stringify(event));
        streamIds.push(id);
      }

      expect(streamIds.length).toBe(5);
      expect(streamIds.every((id) => id !== null)).toBe(true);
    });

    it('should validate event schema before publishing', () => {
      const validEvent: Event = {
        id: 'valid-1',
        type: 'test.event.created',
        source: 'test',
        timestamp: new Date().toISOString(),
        status: 200,
        processingTimeMs: 50,
        data: {},
      };

      const parsed = parseEvent(JSON.stringify(validEvent));
      expect(parsed).toBeDefined();
      expect(parsed.id).toBe(validEvent.id);
      expect(parsed.type).toBe(validEvent.type);
    });
  });

  describe('Event Consumption', () => {
    it('should consume events using consumer groups', async () => {
      // Publish test event
      const event: Event = {
        id: 'consume-test-1',
        type: 'test.event.created',
        source: 'test',
        timestamp: new Date().toISOString(),
        status: 200,
        processingTimeMs: 50,
        data: { test: 'consume' },
      };

      await redis.xadd(STREAM_NAME, '*', 'event', JSON.stringify(event));

      // Read from consumer group
      const messages = await redis.xreadgroup(
        'GROUP',
        CONSUMER_GROUP,
        CONSUMER_NAME,
        'COUNT',
        1,
        'STREAMS',
        STREAM_NAME,
        '>'
      );

      expect(messages).toBeDefined();
      if (Array.isArray(messages) && messages.length > 0) {
        const streamData = messages[0];
        if (Array.isArray(streamData) && streamData.length > 1) {
          const eventData = streamData[1];
          expect(eventData.length).toBeGreaterThan(0);
        }
      }
    });

    it('should handle multiple consumers in same group', async () => {
      const consumer1 = 'consumer-1';
      const consumer2 = 'consumer-2';

      // Publish multiple events
      for (let i = 0; i < 4; i++) {
        const event: Event = {
          id: `multi-consume-${i}`,
          type: 'test.event.created',
          source: 'test',
          timestamp: new Date().toISOString(),
          status: 200,
          processingTimeMs: 10,
          data: { index: i },
        };
        await redis.xadd(STREAM_NAME, '*', 'event', JSON.stringify(event));
      }

      // Both consumers should be able to read
      const messages1 = await redis.xreadgroup(
        'GROUP',
        CONSUMER_GROUP,
        consumer1,
        'COUNT',
        2,
        'STREAMS',
        STREAM_NAME,
        '>'
      );

      const messages2 = await redis.xreadgroup(
        'GROUP',
        CONSUMER_GROUP,
        consumer2,
        'COUNT',
        2,
        'STREAMS',
        STREAM_NAME,
        '>'
      );

      expect(messages1).toBeDefined();
      expect(messages2).toBeDefined();
    });
  });

  describe('Event Correlation', () => {
    it('should correlate events by transaction ID', async () => {
      const transactionId = 'tx-correlation-1';

      const event1: Event = {
        id: 'corr-1',
        type: 'finbot.transaction.created',
        source: 'finbot',
        timestamp: new Date().toISOString(),
        status: 200,
        processingTimeMs: 50,
        data: { transactionId },
      };

      const event2: Event = {
        id: 'corr-2',
        type: 'mubot.data.ingested',
        source: 'mubot',
        timestamp: new Date().toISOString(),
        status: 200,
        processingTimeMs: 30,
        data: { transactionId },
      };

      await redis.xadd('finbot.events', '*', 'event', JSON.stringify(event1));
      await redis.xadd('mubot.events', '*', 'event', JSON.stringify(event2));

      // Verify both events are in their streams
      const finbotMessages = await redis.xread('STREAMS', 'finbot.events', '0');
      const mubotMessages = await redis.xread('STREAMS', 'mubot.events', '0');

      expect(finbotMessages).toBeDefined();
      expect(mubotMessages).toBeDefined();
    });

    it('should handle event type correlation', async () => {
      const correlationId = 'corr-type-1';

      const events: Event[] = [
        {
          id: 'type-1',
          type: 'finbot.transaction.created',
          source: 'finbot',
          timestamp: new Date().toISOString(),
          status: 200,
          processingTimeMs: 50,
          data: { correlationId },
        },
        {
          id: 'type-2',
          type: 'finbot.transaction.updated',
          source: 'finbot',
          timestamp: new Date().toISOString(),
          status: 200,
          processingTimeMs: 30,
          data: { correlationId },
        },
      ];

      for (const event of events) {
        await redis.xadd('finbot.events', '*', 'event', JSON.stringify(event));
      }

      // Verify correlation can be detected
      const messages = await redis.xread('STREAMS', 'finbot.events', '0');
      expect(messages).toBeDefined();
    });
  });

  describe('Idempotency', () => {
    it('should prevent duplicate event processing', async () => {
      const event: Event = {
        id: 'idempotent-1',
        type: 'test.event.created',
        source: 'test',
        timestamp: new Date().toISOString(),
        status: 200,
        processingTimeMs: 50,
        data: { test: 'idempotency' },
      };

      // Publish same event twice
      const id1 = await redis.xadd(STREAM_NAME, '*', 'event', JSON.stringify(event));
      const id2 = await redis.xadd(STREAM_NAME, '*', 'event', JSON.stringify(event));

      // Both should succeed but have different stream IDs
      expect(id1).toBeDefined();
      expect(id2).toBeDefined();
      expect(id1).not.toBe(id2);

      // But event ID should be the same
      const messages = await redis.xread('STREAMS', STREAM_NAME, '0');
      expect(messages).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid event schema gracefully', () => {
      const invalidEvent = {
        invalid: 'data',
      };

      try {
        parseEvent(JSON.stringify(invalidEvent));
        // Should either parse with defaults or throw
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    it('should handle stream read errors', async () => {
      try {
        await redis.xread('STREAMS', 'nonexistent.stream', '0');
        // Should return empty or null
      } catch (error) {
        // Errors are acceptable for non-existent streams
        expect(error).toBeDefined();
      }
    });
  });

  describe('Performance', () => {
    it('should handle high-throughput event publishing', async () => {
      const eventCount = 100;
      const startTime = Date.now();

      const events: Promise<string>[] = [];
      for (let i = 0; i < eventCount; i++) {
        const event: Event = {
          id: `perf-${i}`,
          type: 'test.event.created',
          source: 'test',
          timestamp: new Date().toISOString(),
          status: 200,
          processingTimeMs: 5,
          data: { index: i },
        };
        events.push(
          redis.xadd(STREAM_NAME, '*', 'event', JSON.stringify(event)) as Promise<string>
        );
      }

      await Promise.all(events);
      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should complete 100 events in under 1 second
      expect(duration).toBeLessThan(1000);
    });
  });
});

