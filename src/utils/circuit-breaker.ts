/**
 * Circuit Breaker Pattern Implementation
 * 
 * Prevents cascading failures by stopping requests to a failing service
 * and allowing it time to recover before retrying.
 * 
 * Based on proven patterns from:
 * - Netflix Hystrix
 * - Resilience4j
 * - AWS SDK retry strategies
 */

import { logger } from './logger.js';

export enum CircuitState {
  CLOSED = 'CLOSED',      // Normal operation, requests pass through
  OPEN = 'OPEN',          // Service is failing, requests fail fast
  HALF_OPEN = 'HALF_OPEN' // Testing if service has recovered
}

export interface CircuitBreakerOptions {
  /** Number of failures before opening the circuit */
  failureThreshold?: number;
  /** Time in ms to wait before attempting to close the circuit */
  resetTimeout?: number;
  /** Time in ms to wait in half-open state before considering it recovered */
  halfOpenTimeout?: number;
  /** Time window in ms for counting failures */
  failureWindow?: number;
  /** Optional callback when circuit opens */
  onOpen?: (error: Error) => void;
  /** Optional callback when circuit closes */
  onClose?: () => void;
  /** Optional callback when circuit half-opens */
  onHalfOpen?: () => void;
}

interface FailureRecord {
  timestamp: number;
  error: Error;
}

/**
 * Circuit Breaker class for protecting services from cascading failures
 */
export class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failures: FailureRecord[] = [];
  private lastFailureTime: number = 0;
  private halfOpenAttempts: number = 0;
  private readonly options: Required<CircuitBreakerOptions>;

  constructor(
    private readonly name: string,
    options: CircuitBreakerOptions = {}
  ) {
    this.options = {
      failureThreshold: options.failureThreshold ?? 5,
      resetTimeout: options.resetTimeout ?? 60000, // 1 minute
      halfOpenTimeout: options.halfOpenTimeout ?? 10000, // 10 seconds
      failureWindow: options.failureWindow ?? 60000, // 1 minute
      onOpen: options.onOpen ?? (() => {}),
      onClose: options.onClose ?? (() => {}),
      onHalfOpen: options.onHalfOpen ?? (() => {}),
    };
  }

  /**
   * Execute a function with circuit breaker protection
   */
  async execute<T>(
    fn: () => Promise<T>,
    fallback?: (error: Error) => Promise<T>
  ): Promise<T> {
    // Check circuit state before execution
    this.updateState();

    if (this.state === CircuitState.OPEN) {
      const error = new Error(
        `Circuit breaker "${this.name}" is OPEN. Service unavailable.`
      );
      logger.warn(`[CircuitBreaker] ${this.name} is OPEN`, {
        circuitName: this.name,
        state: this.state,
        lastFailureTime: this.lastFailureTime,
        resetTimeout: this.options.resetTimeout,
      });

      if (fallback) {
        return fallback(error);
      }
      throw error;
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure(error instanceof Error ? error : new Error(String(error)));
      
      if (fallback) {
        return fallback(error instanceof Error ? error : new Error(String(error)));
      }
      throw error;
    }
  }

  /**
   * Get current circuit state
   */
  getState(): CircuitState {
    this.updateState();
    return this.state;
  }

  /**
   * Get circuit breaker statistics
   */
  getStats() {
    return {
      name: this.name,
      state: this.state,
      failureCount: this.failures.length,
      lastFailureTime: this.lastFailureTime,
      halfOpenAttempts: this.halfOpenAttempts,
    };
  }

  /**
   * Manually reset the circuit breaker
   */
  reset(): void {
    this.state = CircuitState.CLOSED;
    this.failures = [];
    this.lastFailureTime = 0;
    this.halfOpenAttempts = 0;
    logger.info(`[CircuitBreaker] ${this.name} manually reset`);
  }

  /**
   * Update circuit state based on current conditions
   */
  private updateState(): void {
    const now = Date.now();

    // Clean old failures outside the failure window
    this.failures = this.failures.filter(
      (f) => now - f.timestamp < this.options.failureWindow
    );

    switch (this.state) {
      case CircuitState.CLOSED:
        // Check if we should open the circuit
        if (this.failures.length >= this.options.failureThreshold) {
          this.open();
        }
        break;

      case CircuitState.OPEN:
        // Check if we should try half-open
        if (now - this.lastFailureTime >= this.options.resetTimeout) {
          this.halfOpen();
        }
        break;

      case CircuitState.HALF_OPEN:
        // If we've been in half-open too long without success, close it
        // This is handled in onSuccess/onFailure
        break;
    }
  }

  /**
   * Handle successful execution
   */
  private onSuccess(): void {
    if (this.state === CircuitState.HALF_OPEN) {
      // Success in half-open means service recovered
      this.close();
    } else if (this.state === CircuitState.CLOSED) {
      // Clear failures on success in closed state
      this.failures = [];
    }
  }

  /**
   * Handle failed execution
   */
  private onFailure(error: Error): void {
    const now = Date.now();
    this.failures.push({ timestamp: now, error });
    this.lastFailureTime = now;

    if (this.state === CircuitState.HALF_OPEN) {
      // Failure in half-open means service hasn't recovered
      this.open();
    } else if (this.state === CircuitState.CLOSED) {
      // Check if we should open
      this.updateState();
    }
  }

  /**
   * Open the circuit (stop allowing requests)
   */
  private open(): void {
    if (this.state !== CircuitState.OPEN) {
      this.state = CircuitState.OPEN;
      logger.error(`[CircuitBreaker] ${this.name} opened`, {
        circuitName: this.name,
        failureCount: this.failures.length,
        failureThreshold: this.options.failureThreshold,
      });
      this.options.onOpen(this.failures[this.failures.length - 1]?.error || new Error('Circuit opened'));
    }
  }

  /**
   * Close the circuit (allow requests)
   */
  private close(): void {
    if (this.state !== CircuitState.CLOSED) {
      this.state = CircuitState.CLOSED;
      this.failures = [];
      this.halfOpenAttempts = 0;
      logger.info(`[CircuitBreaker] ${this.name} closed`, {
        circuitName: this.name,
      });
      this.options.onClose();
    }
  }

  /**
   * Half-open the circuit (test if service recovered)
   */
  private halfOpen(): void {
    if (this.state !== CircuitState.HALF_OPEN) {
      this.state = CircuitState.HALF_OPEN;
      this.halfOpenAttempts++;
      logger.info(`[CircuitBreaker] ${this.name} half-opened`, {
        circuitName: this.name,
        attempt: this.halfOpenAttempts,
      });
      this.options.onHalfOpen();
    }
  }
}

/**
 * Circuit Breaker Manager - Singleton for managing multiple circuit breakers
 */
class CircuitBreakerManager {
  private breakers: Map<string, CircuitBreaker> = new Map();

  /**
   * Get or create a circuit breaker
   */
  get(name: string, options?: CircuitBreakerOptions): CircuitBreaker {
    if (!this.breakers.has(name)) {
      this.breakers.set(name, new CircuitBreaker(name, options));
    }
    return this.breakers.get(name)!;
  }

  /**
   * Reset all circuit breakers
   */
  resetAll(): void {
    this.breakers.forEach((breaker) => breaker.reset());
  }

  /**
   * Get all circuit breaker stats
   */
  getAllStats() {
    return Array.from(this.breakers.values()).map((breaker) => breaker.getStats());
  }
}

export const circuitBreakerManager = new CircuitBreakerManager();

/**
 * Decorator for wrapping async functions with circuit breaker
 */
export function withCircuitBreaker<T extends (...args: any[]) => Promise<any>>(
  name: string,
  fn: T,
  options?: CircuitBreakerOptions
): T {
  const breaker = circuitBreakerManager.get(name, options);
  
  return (async (...args: Parameters<T>) => {
    return breaker.execute(() => fn(...args));
  }) as T;
}

