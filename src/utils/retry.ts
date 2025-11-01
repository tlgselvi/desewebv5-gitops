import { logger } from './logger.js';

export interface RetryOptions {
  maxRetries?: number;
  retryDelay?: number;
  exponentialBackoff?: boolean;
  onRetry?: (attempt: number, error: Error) => void;
}

/**
 * Retry a function with configurable options
 */
export async function retry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxRetries = 3,
    retryDelay = 1000,
    exponentialBackoff = true,
    onRetry,
  } = options;

  let lastError: Error | undefined;
  let delay = retryDelay;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt === maxRetries) {
        logger.error('Retry exhausted', {
          attempts: attempt,
          error: lastError.message,
        });
        throw lastError;
      }

      if (onRetry) {
        onRetry(attempt, lastError);
      }

      logger.warn(`Retry attempt ${attempt}/${maxRetries}`, {
        error: lastError.message,
        nextRetryIn: `${delay}ms`,
      });

      await new Promise((resolve) => setTimeout(resolve, delay));

      if (exponentialBackoff) {
        delay *= 2; // Exponential backoff: 1s, 2s, 4s, 8s...
      }
    }
  }

  throw lastError || new Error('Retry failed');
}

/**
 * Circuit Breaker pattern implementation
 */
export class CircuitBreaker {
  private failures = 0;
  private lastFailureTime: number | null = null;
  private state: 'closed' | 'open' | 'half-open' = 'closed';

  constructor(
    private options: {
      failureThreshold?: number;
      resetTimeout?: number;
      halfOpenMaxAttempts?: number;
    } = {}
  ) {
    this.options = {
      failureThreshold: options.failureThreshold || 5,
      resetTimeout: options.resetTimeout || 60000, // 1 minute
      halfOpenMaxAttempts: options.halfOpenMaxAttempts || 3,
    };
  }

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      if (
        this.lastFailureTime &&
        Date.now() - this.lastFailureTime > this.options.resetTimeout!
      ) {
        // Try to recover - move to half-open state
        this.state = 'half-open';
        logger.info('Circuit breaker moving to half-open state');
      } else {
        throw new Error('Circuit breaker is OPEN - service unavailable');
      }
    }

    try {
      const result = await fn();
      
      // Success - reset failures if in half-open or closed
      if (this.state === 'half-open') {
        this.state = 'closed';
        this.failures = 0;
        logger.info('Circuit breaker recovered - moving to CLOSED state');
      } else if (this.state === 'closed') {
        this.failures = 0; // Reset on success
      }

      return result;
    } catch (error) {
      this.failures++;
      this.lastFailureTime = Date.now();

      if (this.state === 'half-open') {
        // If half-open fails, go back to open
        this.state = 'open';
        logger.warn('Circuit breaker moving back to OPEN state', {
          failures: this.failures,
        });
      } else if (
        this.failures >= this.options.failureThreshold! &&
        this.state === 'closed'
      ) {
        // Threshold reached - open the circuit
        this.state = 'open';
        logger.error('Circuit breaker OPENED', {
          failures: this.failures,
          threshold: this.options.failureThreshold,
        });
      }

      throw error;
    }
  }

  getState(): 'closed' | 'open' | 'half-open' {
    return this.state;
  }

  getFailures(): number {
    return this.failures;
  }

  reset(): void {
    this.failures = 0;
    this.lastFailureTime = null;
    this.state = 'closed';
    logger.info('Circuit breaker manually reset');
  }
}

