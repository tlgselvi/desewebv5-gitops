import { logger } from './logger.js';

export interface RetryOptions {
  maxRetries?: number;
  delayMs?: number;
  maxDelayMs?: number;
  backoffMultiplier?: number;
  /** Add random jitter to prevent thundering herd problem */
  jitter?: boolean;
  /** Jitter type: 'full' (0 to delay) or 'equal' (-delay/2 to +delay/2) */
  jitterType?: 'full' | 'equal';
  retryableErrors?: (error: unknown) => boolean;
  /** Callback before each retry attempt */
  onRetry?: (attempt: number, error: unknown, delayMs: number) => void;
  /** Callback when all retries are exhausted */
  onExhausted?: (error: unknown, attempts: number) => void;
}

/**
 * Retry utility for async operations with exponential backoff and jitter
 * 
 * Features:
 * - Exponential backoff with configurable multiplier
 * - Jitter to prevent thundering herd problem
 * - Configurable max delay cap
 * - Custom retryable error detection
 * - Retry callbacks for monitoring
 * 
 * Based on proven patterns from:
 * - AWS SDK retry strategies
 * - Google Cloud retry policies
 * - Exponential backoff with jitter (RFC 7231)
 * 
 * @param fn Async function to retry
 * @param options Retry configuration options
 * @returns Result of the function call
 */
export async function retry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxRetries = 3,
    delayMs = 1000,
    maxDelayMs = 30000, // 30 seconds max
    backoffMultiplier = 2,
    jitter = true,
    jitterType = 'full',
    retryableErrors = () => true,
    onRetry,
    onExhausted,
  } = options;

  let lastError: unknown;
  let currentDelay = delayMs;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // Check if error is retryable
      if (!retryableErrors(error)) {
        logger.warn('[Retry] Error is not retryable', { 
          error: error instanceof Error ? error.message : String(error),
          attempt: attempt + 1,
        });
        throw error;
      }

      // Don't retry on last attempt
      if (attempt === maxRetries) {
        logger.error('[Retry] Max retries exceeded', {
          attempts: attempt + 1,
          error: error instanceof Error ? error.message : String(error),
        });
        if (onExhausted) {
          onExhausted(error, attempt + 1);
        }
        break;
      }

      // Calculate delay with exponential backoff
      const baseDelay = Math.min(currentDelay, maxDelayMs);
      
      // Add jitter to prevent thundering herd
      let delay = baseDelay;
      if (jitter) {
        if (jitterType === 'full') {
          // Full jitter: random between 0 and baseDelay
          delay = Math.floor(Math.random() * baseDelay);
        } else {
          // Equal jitter: random between -baseDelay/2 and +baseDelay/2
          const jitterAmount = Math.floor(Math.random() * baseDelay) - baseDelay / 2;
          delay = Math.max(0, baseDelay + jitterAmount);
        }
      }

      logger.warn('[Retry] Attempt failed, retrying', {
        attempt: attempt + 1,
        maxRetries: maxRetries + 1,
        delayMs: delay,
        baseDelayMs: baseDelay,
        jitter: jitter ? jitterType : false,
        error: error instanceof Error ? error.message : String(error),
      });

      if (onRetry) {
        onRetry(attempt + 1, error, delay);
      }

      // Wait before retry
      await new Promise((resolve) => setTimeout(resolve, delay));
      
      // Calculate next delay with exponential backoff
      currentDelay = Math.min(currentDelay * backoffMultiplier, maxDelayMs);
    }
  }

  throw lastError;
}

/**
 * Check if HTTP error is retryable (5xx, network errors, timeouts)
 */
export function isRetryableHttpError(error: unknown): boolean {
  if (error instanceof Error) {
    // Network errors
    if (
      error.message.includes('fetch failed') ||
      error.message.includes('network') ||
      error.message.includes('ECONNREFUSED') ||
      error.message.includes('ETIMEDOUT')
    ) {
      return true;
    }
  }

  // For Response objects, check status code
  if (typeof error === 'object' && error !== null && 'status' in error) {
    const status = (error as { status: number }).status;
    // Retry on 5xx errors and 429 (rate limit)
    return status >= 500 || status === 429;
  }

  return true; // Default to retryable for unknown errors
}

