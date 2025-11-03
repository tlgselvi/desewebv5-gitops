import { redis } from '@/services/storage/redisClient.js';
import { logger } from '@/utils/logger.js';
import { parseEvent, Event, EventType } from '@/bus/schema.js';
import { finbotStreamMetrics } from '@/config/prometheus.js';

/**
 * FinBot Event Consumer
 * 
 * Consumes events from finbot.events Redis Stream using Consumer Groups.
 * Implements idempotency, retry, and dead-letter queue (DLQ) handling.
 */

const STREAM_NAME = 'finbot.events';
const CONSUMER_GROUP = 'dese-ai';
const CONSUMER_NAME = `dese-ai-${process.pid}`;
const BATCH_SIZE = 10;
const BLOCK_MS = 5000; // 5 seconds
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

let isRunning = false;
let consumerInterval: NodeJS.Timeout | null = null;

/**
 * Process a single event
 */
async function processEvent(event: Event): Promise<boolean> {
  try {
    logger.info('Processing FinBot event', {
      eventId: event.id,
      eventType: event.type,
      source: event.source,
      timestamp: event.timestamp,
    });

    // Route event based on type
    switch (event.type) {
      case 'finbot.transaction.created':
        await handleTransactionCreated(event);
        break;
      case 'finbot.transaction.updated':
        await handleTransactionUpdated(event);
        break;
      case 'finbot.account.created':
        await handleAccountCreated(event);
        break;
      case 'finbot.budget.updated':
        await handleBudgetUpdated(event);
        break;
      default:
        logger.warn('Unknown event type', { eventType: event.type });
        return false;
    }

    finbotStreamMetrics.eventsProcessed.inc({ event_type: event.type });
    return true;
  } catch (error) {
    logger.error('Error processing event', {
      eventId: event.id,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    
    finbotStreamMetrics.eventsFailed.inc({ event_type: event.type });
    return false;
  }
}

/**
 * Handle transaction.created event
 */
async function handleTransactionCreated(event: Event): Promise<void> {
  const data = event.data as {
    transactionId: string;
    accountId: string;
    amount: number;
    currency: string;
    type: string;
    description?: string;
    metadata?: Record<string, unknown>;
  };

  logger.info('Transaction created event received', {
    transactionId: data.transactionId,
    accountId: data.accountId,
    amount: data.amount,
    currency: data.currency,
    type: data.type,
  });

  // Broadcast to WebSocket clients
  const gateway = getWebSocketGateway();
  if (gateway) {
    gateway.broadcastEvent(event);
  }

  // TODO: Implement actual business logic
  // - Update MuBot accounting records
  // - Trigger AIOps correlation analysis
}

/**
 * Handle transaction.updated event
 */
async function handleTransactionUpdated(event: Event): Promise<void> {
  const data = event.data as {
    transactionId: string;
    changes: Record<string, unknown>;
  };

  logger.info('Transaction updated event received', {
    transactionId: data.transactionId,
    changes: data.changes,
  });

  // TODO: Implement actual business logic
}

/**
 * Handle account.created event
 */
async function handleAccountCreated(event: Event): Promise<void> {
  const data = event.data as {
    accountId: string;
    name: string;
    balance: number;
    currency: string;
  };

  logger.info('Account created event received', {
    accountId: data.accountId,
    name: data.name,
    balance: data.balance,
    currency: data.currency,
  });

  // TODO: Implement actual business logic
}

/**
 * Handle budget.updated event
 */
async function handleBudgetUpdated(event: Event): Promise<void> {
  const data = event.data as {
    budgetId: string;
    category: string;
    amount: number;
    spent: number;
  };

  logger.info('Budget updated event received', {
    budgetId: data.budgetId,
    category: data.category,
    amount: data.amount,
    spent: data.spent,
  });

  // TODO: Implement actual business logic
}

/**
 * Check if event was already processed (idempotency check)
 */
async function isEventProcessed(eventId: string): Promise<boolean> {
  const key = `event:processed:${eventId}`;
  const exists = await redis.exists(key);
  
  if (exists) {
    return true;
  }
  
  // Mark as processed with 24h TTL
  await redis.setex(key, 86400, '1');
  return false;
}

/**
 * Acknowledge event processing
 */
async function acknowledgeEvent(
  streamName: string,
  groupName: string,
  messageId: string
): Promise<void> {
  try {
    await redis.xack(streamName, groupName, messageId);
    logger.debug('Event acknowledged', { streamName, groupName, messageId });
  } catch (error) {
    logger.error('Error acknowledging event', {
      streamName,
      groupName,
      messageId,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Claim pending messages (retry logic)
 */
async function claimPendingMessages(): Promise<void> {
  try {
    const pending = await redis.xpending(STREAM_NAME, CONSUMER_GROUP, '-', '+', BATCH_SIZE);
    
    if (pending && pending.length > 0) {
      logger.info('Claiming pending messages', { count: pending.length });
      
      for (const entry of pending) {
        const [messageId, consumer, idleTime, deliveryCount] = entry as [
          string,
          string,
          number,
          number,
        ];
        
        // Only retry if not exceeded max retries
        if (deliveryCount < MAX_RETRIES && idleTime > RETRY_DELAY_MS) {
          const claimed = await redis.xclaim(
            STREAM_NAME,
            CONSUMER_GROUP,
            CONSUMER_NAME,
            RETRY_DELAY_MS,
            messageId
          );
          
          if (claimed && claimed.length > 0) {
            await processPendingMessage(messageId, claimed[0]);
          }
        } else if (deliveryCount >= MAX_RETRIES) {
          // Move to DLQ
          await moveToDLQ(messageId);
        }
      }
    }
  } catch (error) {
    logger.error('Error claiming pending messages', {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Process pending message
 */
async function processPendingMessage(
  messageId: string,
  messageData: [string, string[]]
): Promise<void> {
  const [, fields] = messageData;
  const eventJson = fields[1]; // Assuming format: ['event', '<json>']
  
  if (!eventJson) {
    logger.warn('Invalid message format', { messageId });
    return;
  }
  
  const event = parseEvent(eventJson);
  
  if (!event) {
    logger.warn('Invalid event signature or format', { messageId });
    await acknowledgeEvent(STREAM_NAME, CONSUMER_GROUP, messageId);
    return;
  }
  
  // Check idempotency
  if (await isEventProcessed(event.id)) {
    logger.debug('Event already processed (idempotency)', { eventId: event.id, messageId });
    await acknowledgeEvent(STREAM_NAME, CONSUMER_GROUP, messageId);
    return;
  }
  
  const success = await processEvent(event);
  
  if (success) {
    await acknowledgeEvent(STREAM_NAME, CONSUMER_GROUP, messageId);
  } else {
    // Will be retried by claimPendingMessages
    logger.warn('Event processing failed, will retry', { eventId: event.id, messageId });
  }
}

/**
 * Move message to dead-letter queue
 */
async function moveToDLQ(messageId: string): Promise<void> {
  try {
    const dlqStream = `${STREAM_NAME}:dlq`;
    // TODO: Extract original message and move to DLQ
    logger.error('Message moved to DLQ', { messageId, dlqStream });
    finbotStreamMetrics.eventsDLQ.inc();
  } catch (error) {
    logger.error('Error moving message to DLQ', {
      messageId,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Read and process messages from stream
 */
async function consumeMessages(): Promise<void> {
  try {
    // Read messages from stream
    const messages = await redis.xreadgroup(
      'GROUP',
      CONSUMER_GROUP,
      CONSUMER_NAME,
      'COUNT',
      BATCH_SIZE,
      'BLOCK',
      BLOCK_MS,
      'STREAMS',
      STREAM_NAME,
      '>' // Read new messages
    );
    
    if (!messages || messages.length === 0) {
      return;
    }
    
    const [streamName, streamMessages] = messages[0] as [string, Array<[string, string[]]>];
    
    if (!streamMessages || streamMessages.length === 0) {
      return;
    }
    
    logger.debug('Messages received from stream', {
      streamName,
      count: streamMessages.length,
    });
    
    finbotStreamMetrics.messagesReceived.inc({ stream: streamName });
    
    // Process each message
    for (const [messageId, fields] of streamMessages) {
      const eventJson = fields[1]; // Assuming format: ['event', '<json>']
      
      if (!eventJson) {
        logger.warn('Invalid message format', { messageId, streamName });
        continue;
      }
      
      const event = parseEvent(eventJson);
      
      if (!event) {
        logger.warn('Invalid event signature or format', { messageId, streamName });
        await acknowledgeEvent(streamName, CONSUMER_GROUP, messageId);
        continue;
      }
      
      // Check idempotency
      if (await isEventProcessed(event.id)) {
        logger.debug('Event already processed (idempotency)', { eventId: event.id, messageId });
        await acknowledgeEvent(streamName, CONSUMER_GROUP, messageId);
        continue;
      }
      
      const success = await processEvent(event);
      
      if (success) {
        await acknowledgeEvent(streamName, CONSUMER_GROUP, messageId);
      } else {
        // Will be retried by claimPendingMessages
        logger.warn('Event processing failed, will retry', { eventId: event.id, messageId });
      }
    }
  } catch (error) {
    logger.error('Error consuming messages', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    
    finbotStreamMetrics.consumeErrors.inc();
  }
}

/**
 * Main consumer loop
 */
async function consumerLoop(): Promise<void> {
  while (isRunning) {
    try {
      await consumeMessages();
      
      // Check for pending messages (retry logic)
      await claimPendingMessages();
    } catch (error) {
      logger.error('Error in consumer loop', {
        error: error instanceof Error ? error.message : String(error),
      });
      
      // Wait before retrying
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
    }
  }
}

/**
 * Initialize consumer group
 */
async function initializeConsumerGroup(): Promise<void> {
  try {
    // Try to create consumer group (will fail if already exists, which is fine)
    await redis.xgroup(
      'CREATE',
      STREAM_NAME,
      CONSUMER_GROUP,
      '0', // Start from beginning
      'MKSTREAM' // Create stream if it doesn't exist
    );
    
    logger.info('Consumer group created', {
      streamName: STREAM_NAME,
      groupName: CONSUMER_GROUP,
    });
  } catch (error) {
    // Group already exists, which is fine
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage.includes('BUSYGROUP')) {
      logger.debug('Consumer group already exists', {
        streamName: STREAM_NAME,
        groupName: CONSUMER_GROUP,
      });
    } else {
      logger.warn('Error creating consumer group (may already exist)', {
        streamName: STREAM_NAME,
        groupName: CONSUMER_GROUP,
        error: errorMessage,
      });
    }
  }
}

/**
 * Start FinBot event consumer
 */
export async function startFinBotConsumer(): Promise<void> {
  if (isRunning) {
    logger.warn('FinBot consumer is already running');
    return;
  }
  
  try {
    await initializeConsumerGroup();
    
    isRunning = true;
    
    // Start consumer loop
    consumerLoop().catch((error) => {
      logger.error('Consumer loop crashed', {
        error: error instanceof Error ? error.message : String(error),
      });
      isRunning = false;
    });
    
    logger.info('FinBot event consumer started', {
      streamName: STREAM_NAME,
      groupName: CONSUMER_GROUP,
      consumerName: CONSUMER_NAME,
    });
  } catch (error) {
    logger.error('Error starting FinBot consumer', {
      error: error instanceof Error ? error.message : String(error),
    });
    isRunning = false;
    throw error;
  }
}

/**
 * Stop FinBot event consumer
 */
export async function stopFinBotConsumer(): Promise<void> {
  if (!isRunning) {
    return;
  }
  
  isRunning = false;
  
  if (consumerInterval) {
    clearInterval(consumerInterval);
    consumerInterval = null;
  }
  
  logger.info('FinBot event consumer stopped', {
    streamName: STREAM_NAME,
    groupName: CONSUMER_GROUP,
    consumerName: CONSUMER_NAME,
  });
}

/**
 * Check if consumer is running
 */
export function isConsumerRunning(): boolean {
  return isRunning;
}

