import { RateLimiterRedis } from 'rate-limiter-flexible';
import { Redis } from 'ioredis';
import { Request, Response, NextFunction } from 'express';
import { logger } from '@/utils/logger.js';
import { createError } from '@/middleware/errorHandler.js';
import type { RequestWithUser } from '@/middleware/auth.js';

export interface RateLimitRule {
  keyPrefix: string;
  points: number;
  duration: number; // seconds
  blockDuration?: number; // seconds
  errorMessage?: string;
}

export class AdvancedRateLimiter {
  private redisClient: Redis;
  private keyPrefix: string;
  private limiters: Map<string, RateLimiterRedis> = new Map();
  private rules: RateLimitRule[] = [];

  constructor(redisUrl: string, keyPrefix: string = 'ratelimit') {
    this.redisClient = new Redis(redisUrl, {
      enableOfflineQueue: false,
      maxRetriesPerRequest: 1,
    });
    this.keyPrefix = keyPrefix;
    
    this.redisClient.on('error', (err) => {
      logger.error('Redis error in rate limiter', { error: err });
    });
  }

  async initialize(): Promise<void> {
    // Basic connectivity check
    try {
      await this.redisClient.ping();
      logger.info('Rate limiter connected to Redis');
    } catch (error) {
      logger.error('Rate limiter failed to connect to Redis', { error });
      throw error;
    }
  }

  addRule(rule: RateLimitRule): void {
    this.rules.push(rule);
    
    // Create limiter instance for this rule
    const limiter = new RateLimiterRedis({
      storeClient: this.redisClient,
      keyPrefix: `${this.keyPrefix}:${rule.keyPrefix}`,
      points: rule.points,
      duration: rule.duration,
      blockDuration: rule.blockDuration,
    });
    
    this.limiters.set(rule.keyPrefix, limiter);
  }

  createMiddleware() {
    return async (req: Request, res: Response, next: NextFunction) => {
      const reqWithUser = req as RequestWithUser;
      const ip = req.ip || req.socket.remoteAddress || 'unknown';
      const userId = reqWithUser.user?.id;
      const orgId = reqWithUser.user?.organizationId;

      try {
        // Check all applicable rules
        for (const rule of this.rules) {
          let key = '';
          
          // Determine key based on rule type
          if (rule.keyPrefix === 'global') {
            key = ip;
          } else if (rule.keyPrefix === 'user' && userId) {
            key = userId;
          } else if (rule.keyPrefix === 'org' && orgId) {
            key = orgId;
          } else if (rule.keyPrefix === 'endpoint') {
            key = `${ip}:${req.path}`;
          } else {
            // Skip rules that don't apply (e.g. user rule for unauthenticated request)
            continue;
          }

          const limiter = this.limiters.get(rule.keyPrefix);
          if (limiter) {
            try {
              await limiter.consume(key);
            } catch (rateLimiterRes) {
              logger.warn('Rate limit exceeded', {
                key,
                rule: rule.keyPrefix,
                ip,
                userId,
                orgId,
              });
              
              return res.status(429).json({
                error: 'Too Many Requests',
                message: rule.errorMessage || 'Rate limit exceeded, please try again later.',
                retryAfter: Math.ceil(rule.duration / 60), // minutes estimate
              });
            }
          }
        }
        
        next();
      } catch (error) {
        logger.error('Rate limiter middleware error', { error });
        // Fail open
        next();
      }
    };
  }

  async close(): Promise<void> {
    await this.redisClient.quit();
  }
}
