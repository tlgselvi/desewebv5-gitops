/**
 * Dynamic Blocking Middleware Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import {
  DynamicBlockingService,
  dynamicBlockingMiddleware,
  loginProtectionMiddleware,
} from '@/middleware/security/dynamic-blocking.js';

// Mock Redis
vi.mock('ioredis', () => {
  const mockRedis = {
    get: vi.fn(),
    set: vi.fn(),
    setex: vi.fn(),
    del: vi.fn(),
    incr: vi.fn(),
    expire: vi.fn(),
    ttl: vi.fn(),
    keys: vi.fn(),
    ping: vi.fn().mockResolvedValue('PONG'),
    quit: vi.fn(),
    on: vi.fn(),
  };
  return {
    default: vi.fn(() => mockRedis),
    Redis: vi.fn(() => mockRedis),
  };
});

// Mock config
vi.mock('@/config/index.js', () => ({
  config: {
    redis: {
      url: 'redis://localhost:6379',
    },
    nodeEnv: 'test',
  },
}));

describe('DynamicBlockingService', () => {
  let service: DynamicBlockingService;

  beforeEach(() => {
    service = new DynamicBlockingService('redis://localhost:6379');
  });

  afterEach(async () => {
    await service.close();
    vi.clearAllMocks();
  });

  describe('isBlocked', () => {
    it('should return blocked: false for allowed IPs', async () => {
      // Create service with allowlist
      const customService = new DynamicBlockingService('redis://localhost:6379', {
        allowedIpList: ['192.168.1.100'],
      });

      const result = await customService.isBlocked('192.168.1.100');
      expect(result.blocked).toBe(false);

      await customService.close();
    });

    it('should return blocked: true for blocked IPs in static list', async () => {
      const customService = new DynamicBlockingService('redis://localhost:6379', {
        blockedIpList: ['10.0.0.1'],
      });

      const result = await customService.isBlocked('10.0.0.1');
      expect(result.blocked).toBe(true);
      expect(result.reason).toBe('IP is in blocklist');

      await customService.close();
    });
  });

  describe('blockIp', () => {
    it('should block an IP address', async () => {
      await service.blockIp('192.168.1.50', 'test_reason', 3600, 5);

      // Verify the IP is blocked locally
      const result = await service.isBlocked('192.168.1.50');
      expect(result.blocked).toBe(true);
      expect(result.reason).toBe('test_reason');
    });
  });

  describe('unblockIp', () => {
    it('should unblock an IP address', async () => {
      // First block
      await service.blockIp('192.168.1.51', 'test', 3600);
      
      // Verify blocked
      let result = await service.isBlocked('192.168.1.51');
      expect(result.blocked).toBe(true);

      // Unblock
      await service.unblockIp('192.168.1.51');

      // Verify unblocked (local list should be cleared)
      result = await service.isBlocked('192.168.1.51');
      expect(result.blocked).toBe(false);
    });
  });

  describe('analyzeRequest', () => {
    it('should detect SQL injection patterns', async () => {
      const mockReq = {
        originalUrl: '/api/users?id=1; DROP TABLE users;--',
        body: {},
        query: {},
      } as Request;

      const result = await service.analyzeRequest(mockReq);
      expect(result.suspicious).toBe(true);
      expect(result.patterns.length).toBeGreaterThan(0);
    });

    it('should detect XSS patterns', async () => {
      const mockReq = {
        originalUrl: '/api/comment',
        body: { comment: '<script>alert("xss")</script>' },
        query: {},
      } as Request;

      const result = await service.analyzeRequest(mockReq);
      expect(result.suspicious).toBe(true);
    });

    it('should detect directory traversal', async () => {
      const mockReq = {
        originalUrl: '/api/files?path=../../../etc/passwd',
        body: {},
        query: {},
      } as Request;

      const result = await service.analyzeRequest(mockReq);
      expect(result.suspicious).toBe(true);
    });

    it('should pass clean requests', async () => {
      const mockReq = {
        originalUrl: '/api/users/123',
        body: { name: 'John Doe', email: 'john@example.com' },
        query: { page: '1' },
      } as Request;

      const result = await service.analyzeRequest(mockReq);
      expect(result.suspicious).toBe(false);
      expect(result.patterns).toHaveLength(0);
    });
  });

  describe('getBlockedIps', () => {
    it('should return all blocked IPs', async () => {
      await service.blockIp('10.0.0.1', 'reason1', 3600);
      await service.blockIp('10.0.0.2', 'reason2', 3600);

      const blockedIps = await service.getBlockedIps();
      expect(blockedIps.length).toBeGreaterThanOrEqual(2);
    });
  });
});

describe('dynamicBlockingMiddleware', () => {
  it('should call next for non-blocked IPs', async () => {
    const middleware = dynamicBlockingMiddleware();
    
    const mockReq = {
      ip: '192.168.1.200',
      socket: { remoteAddress: '192.168.1.200' },
      originalUrl: '/api/test',
      url: '/api/test',
      method: 'GET',
      body: {},
      query: {},
      get: vi.fn().mockReturnValue('Mozilla/5.0'),
    } as unknown as Request;

    const mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    } as unknown as Response;

    const mockNext = vi.fn() as NextFunction;

    await middleware(mockReq, mockRes, mockNext);

    expect(mockNext).toHaveBeenCalled();
  });
});

describe('loginProtectionMiddleware', () => {
  it('should wrap response json to track login attempts', () => {
    const middleware = loginProtectionMiddleware();
    
    const mockReq = {
      ip: '192.168.1.201',
      body: { email: 'test@example.com' },
    } as Request;

    const originalJson = vi.fn();
    const mockRes = {
      json: originalJson,
    } as unknown as Response;

    const mockNext = vi.fn() as NextFunction;

    middleware(mockReq, mockRes, mockNext);

    expect(mockNext).toHaveBeenCalled();
    expect(mockRes.json).not.toBe(originalJson); // json should be wrapped
  });
});

