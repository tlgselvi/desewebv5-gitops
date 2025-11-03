import { z } from 'zod';
import crypto from 'crypto';

/**
 * Event Schema for Redis Streams Event Bus
 * 
 * All events must conform to this schema for type safety and validation.
 * Events are HMAC signed for integrity verification.
 */

/**
 * Event types emitted by different modules
 */
export const EventTypeSchema = z.enum([
  'finbot.transaction.created',
  'finbot.transaction.updated',
  'finbot.account.created',
  'finbot.budget.updated',
  'mubot.ingestion.completed',
  'mubot.data.quality.alert',
  'dese.aiops.anomaly.detected',
  'dese.correlation.matched',
]);

export type EventType = z.infer<typeof EventTypeSchema>;

/**
 * Base Event Schema
 * All events must include: id, type, timestamp, source, data, signature
 */
export const EventSchema = z.object({
  id: z.string().uuid(),
  type: EventTypeSchema,
  timestamp: z.string().datetime(),
  source: z.enum(['finbot', 'mubot', 'dese']),
  data: z.record(z.unknown()), // Flexible data payload
  signature: z.string(), // HMAC-SHA256 signature
  version: z.string().default('1.0.0'),
});

export type Event = z.infer<typeof EventSchema>;

/**
 * Event payload structure for specific event types
 */
export const FinBotTransactionCreatedSchema = z.object({
  transactionId: z.string(),
  accountId: z.string(),
  amount: z.number(),
  currency: z.string(),
  type: z.enum(['income', 'expense', 'transfer']),
  description: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});

export type FinBotTransactionCreated = z.infer<typeof FinBotTransactionCreatedSchema>;

/**
 * HMAC signature verification
 */
export function signEvent(eventData: Omit<Event, 'signature'>): string {
  const secret = process.env.EVENT_BUS_SECRET || 'ea-plan-event-bus-secret-key-min-32-chars';
  const payload = JSON.stringify({
    id: eventData.id,
    type: eventData.type,
    timestamp: eventData.timestamp,
    source: eventData.source,
    data: eventData.data,
    version: eventData.version,
  });
  
  const signature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
  
  return signature;
}

/**
 * Verify event signature
 */
export function verifyEventSignature(event: Event): boolean {
  try {
    const secret = process.env.EVENT_BUS_SECRET || 'ea-plan-event-bus-secret-key-min-32-chars';
    const payload = JSON.stringify({
      id: event.id,
      type: event.type,
      timestamp: event.timestamp,
      source: event.source,
      data: event.data,
      version: event.version,
    });
    
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');
    
    return crypto.timingSafeEqual(
      Buffer.from(event.signature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    );
  } catch (error) {
    return false;
  }
}

/**
 * Create a signed event from data
 */
export function createEvent<T extends z.ZodTypeAny>(
  type: EventType,
  source: 'finbot' | 'mubot' | 'dese',
  data: z.infer<T>,
  dataSchema?: T
): Event {
  // Validate data against schema if provided
  if (dataSchema) {
    dataSchema.parse(data);
  }
  
  const event: Omit<Event, 'signature'> = {
    id: crypto.randomUUID(),
    type,
    timestamp: new Date().toISOString(),
    source,
    data: data as Record<string, unknown>,
    version: '1.0.0',
  };
  
  const signature = signEvent(event);
  
  return {
    ...event,
    signature,
  };
}

/**
 * Validate and parse event from Redis Stream
 */
export function parseEvent(rawEvent: unknown): Event | null {
  try {
    const parsed = typeof rawEvent === 'string' ? JSON.parse(rawEvent) : rawEvent;
    const event = EventSchema.parse(parsed);
    
    // Verify signature
    if (!verifyEventSignature(event)) {
      return null;
    }
    
    return event;
  } catch (error) {
    return null;
  }
}

