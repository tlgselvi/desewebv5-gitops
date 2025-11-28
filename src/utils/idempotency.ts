/**
 * Idempotency Key Pattern Implementation
 * 
 * Prevents duplicate processing of the same request by using idempotency keys.
 * Useful for:
 * - Payment processing
 * - API requests that should only execute once
 * - Distributed systems where retries are common
 * 
 * Based on proven patterns from:
 * - Stripe API idempotency
 * - AWS API Gateway idempotency
 * - RESTful API best practices
 */

import { redis } from '@/services/storage/redisClient.js';
import { logger } from './logger.js';
import { v4 as uuidv4 } from 'uuid';

export interface IdempotencyOptions {
  /** TTL in seconds for idempotency key (default: 24 hours) */
  ttl?: number;
  /** Key prefix for Redis storage */
  keyPrefix?: string;
  /** Whether to include request body hash in key */
  includeBodyHash?: boolean;
}

interface IdempotencyRecord<T = unknown> {
  status: 'processing' | 'completed' | 'failed';
  result?: T;
  error?: string;
  createdAt: number;
  completedAt?: number;
}

/**
 * Generate idempotency key from request
 */
export function generateIdempotencyKey(
  key: string,
  body?: unknown,
  options: IdempotencyOptions = {}
): string {
  const { keyPrefix = 'idempotency', includeBodyHash = true } = options;
  
  let idempotencyKey = key;
  
  if (includeBodyHash && body) {
    // Create hash of body for additional uniqueness
    const bodyHash = hashObject(body);
    idempotencyKey = `${key}:${bodyHash}`;
  }
  
  return `${keyPrefix}:${idempotencyKey}`;
}

/**
 * Simple hash function for objects (not cryptographically secure)
 */
function hashObject(obj: unknown): string {
  const str = JSON.stringify(obj);
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(36);
}

/**
 * Execute a function with idempotency protection
 * 
 * If the same idempotency key is used, returns the cached result
 * instead of executing the function again.
 */
export async function withIdempotency<T>(
  idempotencyKey: string,
  fn: () => Promise<T>,
  options: IdempotencyOptions = {}
): Promise<T> {
  const {
    ttl = 86400, // 24 hours
    keyPrefix = 'idempotency',
    includeBodyHash = true,
  } = options;

  const redisKey = includeBodyHash 
    ? `${keyPrefix}:${idempotencyKey}`
    : generateIdempotencyKey(idempotencyKey, undefined, options);

  try {
    // Check if we have a cached result
    const cached = await redis.get(redisKey);
    
    if (cached) {
      const record: IdempotencyRecord<T> = JSON.parse(cached);
      
      if (record.status === 'completed' && record.result !== undefined) {
        logger.info('[Idempotency] Returning cached result', {
          key: idempotencyKey,
          redisKey,
          createdAt: record.createdAt,
        });
        return record.result;
      }
      
      if (record.status === 'processing') {
        // Another request is processing, wait and retry
        logger.warn('[Idempotency] Request already processing, waiting...', {
          key: idempotencyKey,
          redisKey,
        });
        
        // Wait up to 5 seconds for processing to complete
        for (let i = 0; i < 10; i++) {
          await new Promise((resolve) => setTimeout(resolve, 500));
          const updated = await redis.get(redisKey);
          if (updated) {
            const updatedRecord: IdempotencyRecord<T> = JSON.parse(updated);
            if (updatedRecord.status === 'completed' && updatedRecord.result !== undefined) {
              return updatedRecord.result;
            }
            if (updatedRecord.status === 'failed') {
              throw new Error(updatedRecord.error || 'Previous request failed');
            }
          }
        }
        
        throw new Error('Request is still processing after timeout');
      }
      
      if (record.status === 'failed') {
        // Previous request failed, allow retry
        logger.info('[Idempotency] Previous request failed, retrying', {
          key: idempotencyKey,
          redisKey,
          error: record.error,
        });
      }
    }

    // Mark as processing
    const processingRecord: IdempotencyRecord<T> = {
      status: 'processing',
      createdAt: Date.now(),
    };
    await redis.setex(redisKey, ttl, JSON.stringify(processingRecord));

    try {
      // Execute the function
      const result = await fn();
      
      // Store successful result
      const completedRecord: IdempotencyRecord<T> = {
        status: 'completed',
        result,
        createdAt: processingRecord.createdAt,
        completedAt: Date.now(),
      };
      await redis.setex(redisKey, ttl, JSON.stringify(completedRecord));
      
      logger.info('[Idempotency] Request completed and cached', {
        key: idempotencyKey,
        redisKey,
        duration: completedRecord.completedAt - processingRecord.createdAt,
      });
      
      return result;
    } catch (error) {
      // Store failure
      const failedRecord: IdempotencyRecord<T> = {
        status: 'failed',
        error: error instanceof Error ? error.message : String(error),
        createdAt: processingRecord.createdAt,
        completedAt: Date.now(),
      };
      // Store failure for shorter time (1 hour)
      await redis.setex(redisKey, 3600, JSON.stringify(failedRecord));
      
      logger.error('[Idempotency] Request failed', {
        key: idempotencyKey,
        redisKey,
        error: error instanceof Error ? error.message : String(error),
      });
      
      throw error;
    }
  } catch (error) {
    // If Redis fails, log and continue without idempotency
    logger.error('[Idempotency] Redis error, executing without idempotency', {
      key: idempotencyKey,
      error: error instanceof Error ? error.message : String(error),
    });
    return fn();
  }
}

/**
 * Middleware for Express to extract idempotency key from request
 */
export function getIdempotencyKey(req: { headers: Record<string, string | undefined> }): string | null {
  // Check common headers for idempotency key
  return (
    req.headers['idempotency-key'] ||
    req.headers['x-idempotency-key'] ||
    req.headers['x-request-id'] ||
    null
  );
}

/**
 * Generate a new idempotency key (UUID v4)
 */
export function generateIdempotencyKeyValue(): string {
  return uuidv4();
}

