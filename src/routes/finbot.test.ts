import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import { Router, Request, Response, NextFunction } from 'express';
import { finbotRoutes } from './finbot.js';
import * as redisModule from '@/services/storage/redisClient.js';
import fetch from 'node-fetch';

// Mock fetch
vi.mock('node-fetch', () => ({
  default: vi.fn(),
}));

// Mock Redis
vi.mock('@/services/storage/redisClient.js', () => ({
  redis: {
    get: vi.fn(),
    setex: vi.fn(),
  },
}));

// Mock authenticate middleware
vi.mock('@/middleware/auth.js', () => ({
  authenticate: (req: any, res: any, next: any) => {
    // Default: no user (401 case)
    if (req.headers.authorization) {
      const token = req.headers.authorization.replace('Bearer ', '');
      try {
        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(
          token,
          process.env.JWT_SECRET || 'test-secret-key-for-testing-only'
        );
        req.user = decoded;
      } catch {
        // Invalid token
      }
    }
    if (req.user) {
      next();
    } else {
      res.status(401).json({ error: 'Unauthorized', message: 'No authentication token provided' });
    }
  },
  authorize: (roles: string[]) => (req: any, res: any, next: any) => {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized', message: 'Authentication required' });
      return;
    }
    if (!roles.includes(req.user.role)) {
      res.status(403).json({ error: 'Forbidden', message: 'Insufficient permissions' });
      return;
    }
    next();
  },
}));

const app = express();
app.use(express.json());
app.use('/api/v1/finbot', finbotRoutes);

describe('FinBot Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset fetch mock
    vi.mocked(fetch).mockReset();
  });

  /**
   * Helper function to generate JWT token for testing
   */
  function generateTestToken(role: string = 'finance_analyst'): string {
    const jwt = require('jsonwebtoken');
    return jwt.sign(
      {
        id: 'test-user-id',
        email: 'test@example.com',
        role,
      },
      process.env.JWT_SECRET || 'test-secret-key-for-testing-only',
      { expiresIn: '1h' }
    );
  }

  describe('GET /api/v1/finbot/accounts', () => {
    it('should return 401 when no authentication token provided', async () => {
      // Arrange & Act
      const response = await request(app)
        .get('/api/v1/finbot/accounts')
        .expect('Content-Type', /json/);

      // Assert
      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Unauthorized');
    });

    it('should return 403 when user role is insufficient', async () => {
      // Arrange
      const token = generateTestToken('viewer'); // viewer role doesn't have access

      // Act
      const response = await request(app)
        .get('/api/v1/finbot/accounts')
        .set('Authorization', `Bearer ${token}`)
        .expect('Content-Type', /json/);

      // Assert
      expect(response.status).toBe(403);
      expect(response.body.error).toBe('Forbidden');
    });

    it('should return 200 with cached data when available in Redis', async () => {
      // Arrange
      const token = generateTestToken('finance_analyst');
      const mockAccounts = { accounts: [{ id: '1', name: 'Test Account' }] };
      vi.mocked(redisModule.redis.get).mockResolvedValue(
        JSON.stringify(mockAccounts)
      );

      // Act
      const response = await request(app)
        .get('/api/v1/finbot/accounts')
        .set('Authorization', `Bearer ${token}`)
        .expect('Content-Type', /json/);

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockAccounts);
      expect(redisModule.redis.get).toHaveBeenCalledWith('finbot:accounts');
    });

    it('should return 200 with data from FinBot service when cache miss', async () => {
      // Arrange
      const token = generateTestToken('finance_analyst');
      const mockAccounts = { accounts: [{ id: '1', name: 'Test Account' }] };

      vi.mocked(redisModule.redis.get).mockResolvedValue(null); // Cache miss
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockAccounts,
      } as any);

      // Act
      const response = await request(app)
        .get('/api/v1/finbot/accounts')
        .set('Authorization', `Bearer ${token}`)
        .expect('Content-Type', /json/);

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockAccounts);
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/finbot/accounts'),
        expect.objectContaining({ method: 'GET' })
      );
      expect(redisModule.redis.setex).toHaveBeenCalledWith(
        'finbot:accounts',
        60,
        JSON.stringify(mockAccounts)
      );
    });

    it('should return 502 when FinBot service is unavailable', async () => {
      // Arrange
      const token = generateTestToken('finance_analyst');

      vi.mocked(redisModule.redis.get).mockResolvedValue(null);
      vi.mocked(fetch).mockResolvedValue({
        ok: false,
        status: 502,
        statusText: 'Bad Gateway',
      } as any);

      // Act
      const response = await request(app)
        .get('/api/v1/finbot/accounts')
        .set('Authorization', `Bearer ${token}`)
        .expect('Content-Type', /json/);

      // Assert
      expect(response.status).toBe(502);
      expect(response.body.error).toBe('upstream_unavailable');
    });
  });

  describe('GET /api/v1/finbot/health', () => {
    it('should return 200 with healthy status when FinBot is healthy', async () => {
      // Arrange
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ status: 'ok', version: '2.0.0' }),
      } as any);

      // Act
      const response = await request(app)
        .get('/api/v1/finbot/health')
        .set('Authorization', `Bearer ${generateTestToken('viewer')}`)
        .expect('Content-Type', /json/);

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.status).toBe('healthy');
      expect(response.body.finbot).toEqual({ status: 'ok', version: '2.0.0' });
    });

    it('should return 502 when FinBot health check fails', async () => {
      // Arrange
      const token = generateTestToken('viewer');
      vi.mocked(fetch).mockResolvedValue({
        ok: false,
        status: 503,
        statusText: 'Service Unavailable',
      } as any);

      // Act
      const response = await request(app)
        .get('/api/v1/finbot/health')
        .set('Authorization', `Bearer ${token}`)
        .expect('Content-Type', /json/);

      // Assert
      expect(response.status).toBe(502);
      expect(response.body.status).toBe('unhealthy');
    });

    it('should return 502 when FinBot service connection fails', async () => {
      // Arrange
      const token = generateTestToken('viewer');
      vi.mocked(fetch).mockRejectedValue(new Error('Connection refused'));

      // Act
      const response = await request(app)
        .get('/api/v1/finbot/health')
        .set('Authorization', `Bearer ${token}`)
        .expect('Content-Type', /json/);

      // Assert
      expect(response.status).toBe(502);
      expect(response.body.status).toBe('unhealthy');
      expect(response.body.message).toContain('Failed to connect');
    });
  });

  describe('Authorization', () => {
    it('should allow finance_analyst role', async () => {
      // Arrange
      const token = generateTestToken('finance_analyst');
      vi.mocked(redisModule.redis.get).mockResolvedValue(
        JSON.stringify({ accounts: [] })
      );

      // Act
      const response = await request(app)
        .get('/api/v1/finbot/accounts')
        .set('Authorization', `Bearer ${token}`);

      // Assert
      expect(response.status).toBe(200);
    });

    it('should allow accountant role', async () => {
      // Arrange
      const token = generateTestToken('accountant');
      vi.mocked(redisModule.redis.get).mockResolvedValue(
        JSON.stringify({ accounts: [] })
      );

      // Act
      const response = await request(app)
        .get('/api/v1/finbot/accounts')
        .set('Authorization', `Bearer ${token}`);

      // Assert
      expect(response.status).toBe(200);
    });

    it('should allow admin role', async () => {
      // Arrange
      const token = generateTestToken('admin');
      vi.mocked(redisModule.redis.get).mockResolvedValue(
        JSON.stringify({ accounts: [] })
      );

      // Act
      const response = await request(app)
        .get('/api/v1/finbot/accounts')
        .set('Authorization', `Bearer ${token}`);

      // Assert
      expect(response.status).toBe(200);
    });
  });
});

