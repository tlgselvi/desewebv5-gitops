/**
 * Rate Limit Manager
 * 
 * Singleton service to manage advanced rate limiting across the application
 */

import { AdvancedRateLimiter } from '@/middleware/rate-limit/advanced-rate-limit.js';
import { endpointRateLimitRules, createOrganizationTierRules } from '@/config/rate-limit.config.js';
import { config } from '@/config/index.js';
import { logger } from '@/utils/logger.js';
import { rateLimitTrackingService } from './rate-limit-tracking.service.js';

class RateLimitManager {
  private limiter: AdvancedRateLimiter | null = null;
  private initialized = false;

  /**
   * Initialize rate limit manager
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      const redisUrl = config.redis?.url || process.env.REDIS_URL || 'redis://localhost:6379';
      this.limiter = new AdvancedRateLimiter(redisUrl, 'dese:ratelimit');
      
      await this.limiter.initialize();

      // Add endpoint-specific rules
      for (const rule of endpointRateLimitRules) {
        this.limiter.addRule(rule);
      }

      // Add organization tier rules
      const orgTierRules = createOrganizationTierRules();
      for (const rule of orgTierRules) {
        this.limiter.addRule(rule);
      }

      this.initialized = true;
      logger.info('Rate limit manager initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize rate limit manager', { error });
      // Continue without rate limiting (fail open)
      this.limiter = null;
    }
  }

  /**
   * Get rate limit middleware
   */
  getMiddleware() {
    if (!this.limiter) {
      // Return no-op middleware if rate limiting is not available
      return async (req: any, res: any, next: any) => next();
    }

    return this.limiter.createMiddleware();
  }

  /**
   * Close rate limit manager
   */
  async close(): Promise<void> {
    if (this.limiter) {
      await this.limiter.close();
      this.limiter = null;
      this.initialized = false;
    }
  }

  /**
   * Check if rate limiting is enabled
   */
  isEnabled(): boolean {
    return this.initialized && this.limiter !== null;
  }
}

export const rateLimitManager = new RateLimitManager();

