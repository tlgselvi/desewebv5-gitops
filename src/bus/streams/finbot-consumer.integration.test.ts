import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { redis } from '@/services/storage/redisClient.js';
import { createEvent, parseEvent } from '@/bus/schema.js';
import { finbotStreamMetrics } from '@/config/prometheus.js';

/**
 * Integration tests for FinBot event consumer
 * 
 * These tests require a running Redis instance.
 * They test the actual XADD → XREADGROUP flow.
 */

const STREAM_NAME = 'finbot.events:test';
const CONSUMER_GROUP = 'test-group';

describe('FinBot Consumer Integration', () => {
  beforeEach(async () => {
    // Clean up test stream and group
    try {
      await redis.del(STREAM_NAME);
      await redis.del(`${STREAM_NAME}:dlq`);
    } catch {
      // Ignore if doesn't exist
    }
    
    try {
      await redis.xgroup('DESTROY', STREAM_NAME, CONSUMER_GROUP);
    } catch {
      // Ignore if doesn't exist
    }
  });

  afterEach(async () => {
    // Clean up
    try {
      await redis.del(STREAM_NAME);
      await redis.del(`${STREAM_NAME}:dlq`);
      await redis.xgroup('DESTROY', STREAM_NAME, CONSUMER_GROUP);
    } catch {
      // Ignore
    }
  });

  it('should publish event to Redis Stream using XADD', async () => {
    const event = createEvent('finbot.transaction.created', 'finbot', {
      transactionId: 'test-123',
      accountId: 'acc-1',
      amount: 100,
      currency: 'USD',
      type: 'income',
    });

    const eventJson = JSON.stringify(event);

    // Publish event
    const messageId = await redis.xadd(
      STREAM_NAME,
      '*', // Auto-generate message ID
      'event',
      eventJson
    );

    expect(messageId).toBeDefined();
    expect(typeof messageId).toBe('string');
  });

  it('should read event from stream using XREADGROUP', async () => {
    // Create consumer group
    await redis.xgroup('CREATE', STREAM_NAME, CONSUMER_GROUP, '0', 'MKSTREAM');

    // Publish event
    const event = createEvent('finbot.transaction.created', 'finbot', {
      transactionId: 'test-456',
      accountId: 'acc-2',
      amount: 200,
      currency: 'EUR',
      type: 'expense',
    });

    const eventJson = JSON.stringify(event);
    await redis.xadd(STREAM_NAME, '*', 'event', eventJson);

    // Read from stream
    const messages = await redis.xreadgroup(
      'GROUP',
      CONSUMER_GROUP,
      'test-consumer',
      'COUNT',
      1,
      'BLOCK',
      1000,
      'STREAMS',
      STREAM_NAME,
      '>' // Read new messages
    );

    expect(messages).toBeDefined();
    expect(messages.length).toBeGreaterThan(0);

    const [streamName, streamMessages] = messages[0] as [string, Array<[string, string[]]>];
    expect(streamName).toBe(STREAM_NAME);
    expect(streamMessages.length).toBe(1);

    const [messageId, fields] = streamMessages[0];
    expect(messageId).toBeDefined();
    
    const eventJsonReceived = fields[1];
    const parsedEvent = parseEvent(eventJsonReceived);
    
    expect(parsedEvent).not.toBeNull();
    expect(parsedEvent?.type).toBe('finbot.transaction.created');
    expect((parsedEvent?.data as any).transactionId).toBe('test-456');
  });

  it('should acknowledge processed message using XACK', async () => {
    // Create consumer group
    await redis.xgroup('CREATE', STREAM_NAME, CONSUMER_GROUP, '0', 'MKSTREAM');

    // Publish event
    const event = createEvent('finbot.transaction.created', 'finbot', {
      transactionId: 'test-789',
      accountId: 'acc-3',
      amount: 300,
      currency: 'GBP',
      type: 'transfer',
    });

    const eventJson = JSON.stringify(event);
    const messageId = await redis.xadd(STREAM_NAME, '*', 'event', eventJson);

    // Read message
    const messages = await redis.xreadgroup(
      'GROUP',
      CONSUMER_GROUP,
      'test-consumer',
      'COUNT',
      1,
      'BLOCK',
      1000,
      'STREAMS',
      STREAM_NAME,
      '>'
    );

    const [, streamMessages] = messages[0] as [string, Array<[string, string[]]>];
    const [readMessageId] = streamMessages[0];

    // Acknowledge
    const acked = await redis.xack(STREAM_NAME, CONSUMER_GROUP, readMessageId);
    expect(acked).toBe(1);

    // Check pending (should be empty after ACK)
    const pending = await redis.xpending(STREAM_NAME, CONSUMER_GROUP, '-', '+', 10);
    expect(pending.length).toBe(0);
  });

  it('should detect pending messages using XPENDING', async () => {
    // Create consumer group
    await redis.xgroup('CREATE', STREAM_NAME, CONSUMER_GROUP, '0', 'MKSTREAM');

    // Publish event
    const event = createEvent('finbot.transaction.created', 'finbot', {
      transactionId: 'test-pending',
      accountId: 'acc-4',
      amount: 400,
      currency: 'JPY',
      type: 'income',
    });

    const eventJson = JSON.stringify(event);
    await redis.xadd(STREAM_NAME, '*', 'event', eventJson);

    // Read message but don't ACK
    await redis.xreadgroup(
      'GROUP',
      CONSUMER_GROUP,
      'test-consumer',
      'COUNT',
      1,
      'BLOCK',
      1000,
      'STREAMS',
      STREAM_NAME,
      '>'
    );

    // Check pending
    const pending = await redis.xpending(STREAM_NAME, CONSUMER_GROUP, '-', '+', 10);
    expect(pending.length).toBeGreaterThan(0);
    
    const [messageId, consumer, idleTime, deliveryCount] = pending[0] as [
      string,
      string,
      number,
      number,
    ];
    
    expect(messageId).toBeDefined();
    expect(consumer).toBe('test-consumer');
    expect(deliveryCount).toBe(1);
  });
});

