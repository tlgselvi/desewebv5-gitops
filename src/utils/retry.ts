import { logger } from './logger.js';

export interface RetryOptions {
  maxRetries?: number;
  delayMs?: number;
  backoffMultiplier?: number;
  retryableErrors?: (error: unknown) => boolean;
}

/**
 * Retry utility for async operations with exponential backoff
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
    backoffMultiplier = 2,
    retryableErrors = () => true,
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
        logger.warn('[Retry] Error is not retryable', { error, attempt });
        throw error;
      }

      // Don't retry on last attempt
      if (attempt === maxRetries) {
        logger.error('[Retry] Max retries exceeded', {
          attempts: attempt + 1,
          error: error instanceof Error ? error.message : String(error),
        });
        break;
      }

      logger.warn('[Retry] Attempt failed, retrying', {
        attempt: attempt + 1,
        maxRetries,
        delayMs: currentDelay,
        error: error instanceof Error ? error.message : String(error),
      });

      // Wait before retry with exponential backoff
      await new Promise((resolve) => setTimeout(resolve, currentDelay));
      currentDelay *= backoffMultiplier;
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

