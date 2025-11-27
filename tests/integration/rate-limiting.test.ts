/**
 * Rate Limiting Integration Tests
 * 
 * Tests advanced rate limiting functionality end-to-end
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import express, { Application } from 'express';
import { AdvancedRateLimiter } from '@/middleware/rate-limit/advanced-rate-limit.js';
import { endpointRateLimitRules } from '@/config/rate-limit.config.js';

describe('Rate Limiting Integration Tests', () => {
  let app: Application;
  let rateLimiter: AdvancedRateLimiter;

  beforeEach(async () => {
    app = express();
    app.use(express.json());

    // Initialize rate limiter with mock Redis
    rateLimiter = new AdvancedRateLimiter('redis://localhost:6379', 'test:ratelimit');
    
    // Mock Redis connection (in practice, use testcontainers)
    vi.spyOn(rateLimiter as any, 'redisClient', 'get').mockReturnValue(null);
    
    // Add test route
    app.get('/api/v1/test', rateLimiter.createMiddleware(), (req, res) => {
      res.json({ message: 'Success' });
    });

    // Add rate limit rule for test endpoint
    rateLimiter.addRule({
      endpoint: '/api/v1/test',
      config: {
        windowMs: 60000, // 1 minute
        max: 5, // 5 requests per minute
        keyGenerator: 'ip',
        algorithm: 'sliding-window',
        standardHeaders: true,
        legacyHeaders: false,
      },
      priority: 100,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should allow requests within rate limit', async () => {
    const agent = request(app);
    
    // Make 5 requests (within limit)
    for (let i = 0; i < 5; i++) {
      const response = await agent.get('/api/v1/test').expect(200);
      expect(response.body.message).toBe('Success');
    }
  });

  it('should reject requests exceeding rate limit', async () => {
    const agent = request(app);
    
    // Make 5 requests (within limit)
    for (let i = 0; i < 5; i++) {
      await agent.get('/api/v1/test').expect(200);
    }

    // 6th request should be rejected
    const response = await agent.get('/api/v1/test').expect(429);
    expect(response.body.error).toBe('Too Many Requests');
    expect(response.body.retryAfter).toBeDefined();
  });

  it('should include rate limit headers', async () => {
    const agent = request(app);
    
    const response = await agent.get('/api/v1/test').expect(200);
    
    expect(response.headers['x-ratelimit-limit']).toBeDefined();
    expect(response.headers['x-ratelimit-remaining']).toBeDefined();
    expect(response.headers['x-ratelimit-reset']).toBeDefined();
  });

  it('should handle different IP addresses independently', async () => {
    const agent1 = request(app);
    const agent2 = request(app);

    // Agent 1 makes 5 requests
    for (let i = 0; i < 5; i++) {
      await agent1.get('/api/v1/test').set('X-Forwarded-For', '192.168.1.1').expect(200);
    }

    // Agent 2 should still be able to make requests (different IP)
    await agent2.get('/api/v1/test').set('X-Forwarded-For', '192.168.1.2').expect(200);
  });
});

