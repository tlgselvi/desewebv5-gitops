import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { authenticate, authorize, optionalAuth } from './auth.js';

// Mock dependencies
const mockConfig = {
  security: {
    jwtSecret: 'test-secret-key-min-32-chars-long-for-testing',
    jwtExpiresIn: '24h',
  },
};

vi.mock('@/config/index.js', () => ({
  config: mockConfig,
}));

const mockDb = {
  select: vi.fn(),
  from: vi.fn(),
  where: vi.fn(),
  limit: vi.fn(),
};

vi.mock('@/db/index.js', () => ({
  db: mockDb,
  users: {},
}));

vi.mock('@/utils/logger.js', () => ({
  logger: {
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

// Note: config and db are mocked, so we don't import them here

describe('Authentication Middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let nextFunction: NextFunction;

  beforeEach(() => {
    mockRequest = {
      headers: {},
      ip: '127.0.0.1',
      url: '/test',
    };
    mockResponse = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };
    nextFunction = vi.fn();
    vi.clearAllMocks();
  });

  describe('authenticate', () => {
    it('should return 401 if no authorization header', async () => {
      await authenticate(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Unauthorized',
        message: 'No authentication token provided',
      });
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should return 401 if token is missing', async () => {
      mockRequest.headers = {
        authorization: 'Bearer ',
      };

      await authenticate(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should return 401 if token is invalid', async () => {
      mockRequest.headers = {
        authorization: 'Bearer invalid-token',
      };

      await authenticate(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Unauthorized',
        message: 'Invalid authentication token',
      });
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should return 401 if token is expired', async () => {
      const expiredToken = jwt.sign(
        { id: 'user-123', email: 'test@test.com', role: 'user' },
        mockConfig.security.jwtSecret,
        { expiresIn: '-1h' }
      );

      mockRequest.headers = {
        authorization: `Bearer ${expiredToken}`,
      };

      await authenticate(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Unauthorized',
        message: 'Token has expired',
      });
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should call next if token is valid and user exists', async () => {
      const validToken = jwt.sign(
        { id: 'user-123', email: 'test@test.com', role: 'user' },
        mockConfig.security.jwtSecret
      );

      mockRequest.headers = {
        authorization: `Bearer ${validToken}`,
      };

      // Mock database query chain
      const mockQuery = {
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([
          {
            id: 'user-123',
            email: 'test@test.com',
            role: 'user',
            isActive: true,
          },
        ]),
      };

      vi.mocked(mockDb.select).mockReturnValue(mockQuery as any);
      vi.mocked(mockDb.from).mockReturnValue(mockQuery as any);

      await authenticate(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(nextFunction).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should return 401 if user not found in database', async () => {
      const validToken = jwt.sign(
        { id: 'user-123', email: 'test@test.com', role: 'user' },
        mockConfig.security.jwtSecret
      );

      mockRequest.headers = {
        authorization: `Bearer ${validToken}`,
      };

      const mockQuery = {
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([]),
      };

      vi.mocked(mockDb.select).mockReturnValue(mockQuery as any);
      vi.mocked(mockDb.from).mockReturnValue(mockQuery as any);

      await authenticate(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Unauthorized',
        message: 'User not found',
      });
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should return 401 if user is inactive', async () => {
      const validToken = jwt.sign(
        { id: 'user-123', email: 'test@test.com', role: 'user' },
        mockConfig.security.jwtSecret
      );

      mockRequest.headers = {
        authorization: `Bearer ${validToken}`,
      };

      const mockQuery = {
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([
          {
            id: 'user-123',
            email: 'test@test.com',
            role: 'user',
            isActive: false,
          },
        ]),
      };

      vi.mocked(mockDb.select).mockReturnValue(mockQuery as any);
      vi.mocked(mockDb.from).mockReturnValue(mockQuery as any);

      await authenticate(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Unauthorized',
        message: 'User account is disabled',
      });
      expect(nextFunction).not.toHaveBeenCalled();
    });
  });

  describe('authorize', () => {
    it('should allow access if user has required role', () => {
      const req = {
        user: { id: 'user-123', role: 'admin' },
      } as any;

      const middleware = authorize(['admin', 'manager']);

      middleware(req as Request, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should deny access if user does not have required role', () => {
      const req = {
        user: { id: 'user-123', role: 'user' },
      } as any;

      const middleware = authorize(['admin']);

      middleware(req as Request, mockResponse as Response, nextFunction);

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Forbidden',
        message: 'Insufficient permissions',
      });
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should deny access if user is not authenticated', () => {
      const req = {} as any;

      const middleware = authorize(['admin']);

      middleware(req as Request, mockResponse as Response, nextFunction);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Unauthorized',
        message: 'Authentication required',
      });
      expect(nextFunction).not.toHaveBeenCalled();
    });
  });

  describe('optionalAuth', () => {
    it('should continue without auth if no token provided', async () => {
      await optionalAuth(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(nextFunction).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should set user if valid token provided', async () => {
      const validToken = jwt.sign(
        { id: 'user-123', email: 'test@test.com', role: 'user' },
        mockConfig.security.jwtSecret
      );

      mockRequest.headers = {
        authorization: `Bearer ${validToken}`,
      };

      const mockQuery = {
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([
          {
            id: 'user-123',
            email: 'test@test.com',
            role: 'user',
            isActive: true,
          },
        ]),
      };

      vi.mocked(mockDb.select).mockReturnValue(mockQuery as any);
      vi.mocked(mockDb.from).mockReturnValue(mockQuery as any);

      await optionalAuth(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(nextFunction).toHaveBeenCalled();
      expect((mockRequest as any).user).toBeDefined();
    });
  });
});

