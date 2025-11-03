import { describe, it, expect } from 'vitest';
import {
  EventSchema,
  EventTypeSchema,
  createEvent,
  signEvent,
  verifyEventSignature,
  parseEvent,
  FinBotTransactionCreatedSchema,
} from './schema.js';
import crypto from 'crypto';

describe('Event Schema', () => {
  describe('EventTypeSchema', () => {
    it('should accept valid event types', () => {
      expect(EventTypeSchema.parse('finbot.transaction.created')).toBe(
        'finbot.transaction.created'
      );
      expect(EventTypeSchema.parse('mubot.ingestion.completed')).toBe(
        'mubot.ingestion.completed'
      );
    });

    it('should reject invalid event types', () => {
      expect(() => EventTypeSchema.parse('invalid.event')).toThrow();
    });
  });

  describe('EventSchema', () => {
    it('should validate a complete event', () => {
      const event = {
        id: crypto.randomUUID(),
        type: 'finbot.transaction.created',
        timestamp: new Date().toISOString(),
        source: 'finbot',
        data: { transactionId: '123', amount: 100 },
        signature: 'test-signature',
        version: '1.0.0',
      };

      const result = EventSchema.parse(event);
      expect(result).toEqual(event);
    });

    it('should reject event with missing required fields', () => {
      const event = {
        id: crypto.randomUUID(),
        type: 'finbot.transaction.created',
        // Missing timestamp, source, data, signature
      };

      expect(() => EventSchema.parse(event)).toThrow();
    });
  });

  describe('signEvent', () => {
    it('should create HMAC signature', () => {
      const eventData = {
        id: crypto.randomUUID(),
        type: 'finbot.transaction.created',
        timestamp: new Date().toISOString(),
        source: 'finbot',
        data: { test: 'data' },
        version: '1.0.0',
      };

      const signature = signEvent(eventData);
      expect(signature).toBeDefined();
      expect(typeof signature).toBe('string');
      expect(signature.length).toBe(64); // SHA256 hex = 64 chars
    });

    it('should produce same signature for same input', () => {
      const eventData = {
        id: 'test-id',
        type: 'finbot.transaction.created',
        timestamp: '2024-01-01T00:00:00.000Z',
        source: 'finbot',
        data: { test: 'data' },
        version: '1.0.0',
      };

      const sig1 = signEvent(eventData);
      const sig2 = signEvent(eventData);
      expect(sig1).toBe(sig2);
    });
  });

  describe('verifyEventSignature', () => {
    it('should verify valid signature', () => {
      const eventData = {
        id: crypto.randomUUID(),
        type: 'finbot.transaction.created',
        timestamp: new Date().toISOString(),
        source: 'finbot',
        data: { test: 'data' },
        version: '1.0.0',
      };

      const signature = signEvent(eventData);
      const event = { ...eventData, signature };

      expect(verifyEventSignature(event as any)).toBe(true);
    });

    it('should reject invalid signature', () => {
      const event = {
        id: crypto.randomUUID(),
        type: 'finbot.transaction.created',
        timestamp: new Date().toISOString(),
        source: 'finbot',
        data: { test: 'data' },
        signature: 'invalid-signature',
        version: '1.0.0',
      };

      expect(verifyEventSignature(event as any)).toBe(false);
    });
  });

  describe('createEvent', () => {
    it('should create a signed event', () => {
      const data = {
        transactionId: '123',
        accountId: 'acc-1',
        amount: 100,
        currency: 'USD',
        type: 'income',
      };

      const event = createEvent(
        'finbot.transaction.created',
        'finbot',
        data,
        FinBotTransactionCreatedSchema
      );

      expect(event.id).toBeDefined();
      expect(event.type).toBe('finbot.transaction.created');
      expect(event.source).toBe('finbot');
      expect(event.data).toEqual(data);
      expect(event.signature).toBeDefined();
      expect(verifyEventSignature(event)).toBe(true);
    });
  });

  describe('parseEvent', () => {
    it('should parse valid event from JSON string', () => {
      const eventData = {
        id: crypto.randomUUID(),
        type: 'finbot.transaction.created',
        timestamp: new Date().toISOString(),
        source: 'finbot',
        data: { test: 'data' },
        version: '1.0.0',
      };

      const signature = signEvent(eventData);
      const event = { ...eventData, signature };
      const eventJson = JSON.stringify(event);

      const parsed = parseEvent(eventJson);
      expect(parsed).not.toBeNull();
      expect(parsed?.id).toBe(event.id);
      expect(parsed?.type).toBe(event.type);
    });

    it('should reject event with invalid signature', () => {
      const event = {
        id: crypto.randomUUID(),
        type: 'finbot.transaction.created',
        timestamp: new Date().toISOString(),
        source: 'finbot',
        data: { test: 'data' },
        signature: 'invalid-signature',
        version: '1.0.0',
      };

      const parsed = parseEvent(JSON.stringify(event));
      expect(parsed).toBeNull();
    });

    it('should return null for invalid JSON', () => {
      const parsed = parseEvent('invalid-json');
      expect(parsed).toBeNull();
    });
  });
});

