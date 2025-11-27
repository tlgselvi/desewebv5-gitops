import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { requireRole, requireModulePermission, requireModuleAccess } from '@/middleware/rbac.js';
import { hasPermission } from '@/services/rbac/permission.service.js';
import { CustomError } from '@/middleware/errorHandler.js';
import type { RequestWithUser } from '@/middleware/auth.js';

// Mock permission service
vi.mock('@/services/rbac/permission.service.js', () => ({
  hasPermission: vi.fn(),
}));

// Mock logger
vi.mock('@/utils/logger.js', () => ({
  logger: {
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

describe('RBAC Middleware', () => {
  let mockReq: Partial<RequestWithUser>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    vi.clearAllMocks();

    mockReq = {
      user: {
        id: 'user-1',
        email: 'test@example.com',
        role: 'admin',
        organizationId: 'org-1',
      },
      path: '/api/v1/finance/invoices',
      method: 'GET',
    };

    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };

    mockNext = vi.fn();
  });

  describe('requireRole', () => {
    it('should allow access for allowed role', () => {
      const middleware = requireRole(['admin', 'user']);

      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
      expect(mockNext).toHaveBeenCalledTimes(1);
    });

    it('should deny access for disallowed role', () => {
      const middleware = requireRole(['super_admin']);

      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(CustomError));
      const error = (mockNext as any).mock.calls[0][0] as CustomError;
      expect(error.statusCode).toBe(403);
    });

    it('should deny access when user is not authenticated', () => {
      delete mockReq.user;
      const middleware = requireRole(['admin']);

      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(CustomError));
      const error = (mockNext as any).mock.calls[0][0] as CustomError;
      expect(error.statusCode).toBe(401);
    });
  });

  describe('requireModulePermission', () => {
    it('should allow access when user has permission', async () => {
      vi.mocked(hasPermission).mockResolvedValue(true);

      const middleware = requireModulePermission('finance', 'read');

      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(hasPermission).toHaveBeenCalledWith('user-1', 'org-1', 'finance', 'read');
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should deny access when user lacks permission', async () => {
      vi.mocked(hasPermission).mockResolvedValue(false);

      const middleware = requireModulePermission('finance', 'write');

      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(CustomError));
      const error = (mockNext as any).mock.calls[0][0] as CustomError;
      expect(error.statusCode).toBe(403);
    });

    it('should deny access when organizationId is missing', async () => {
      delete (mockReq.user as any).organizationId;

      const middleware = requireModulePermission('finance', 'read');

      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(CustomError));
      const error = (mockNext as any).mock.calls[0][0] as CustomError;
      expect(error.statusCode).toBe(400);
    });
  });

  describe('requireModuleAccess', () => {
    it('should detect module from path and allow access', async () => {
      vi.mocked(hasPermission).mockResolvedValue(true);

      const middleware = requireModuleAccess();

      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(hasPermission).toHaveBeenCalledWith('user-1', 'org-1', 'finance', 'read');
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should use provided module instead of detecting from path', async () => {
      vi.mocked(hasPermission).mockResolvedValue(true);

      const middleware = requireModuleAccess('crm');

      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(hasPermission).toHaveBeenCalledWith('user-1', 'org-1', 'crm', 'read');
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should map HTTP methods to actions correctly', async () => {
      vi.mocked(hasPermission).mockResolvedValue(true);

      // Test POST -> write
      mockReq.method = 'POST';
      const middlewarePost = requireModuleAccess('finance');
      await middlewarePost(mockReq as Request, mockRes as Response, mockNext);
      expect(hasPermission).toHaveBeenCalledWith('user-1', 'org-1', 'finance', 'write');

      // Test DELETE -> delete
      mockReq.method = 'DELETE';
      const middlewareDelete = requireModuleAccess('finance');
      await middlewareDelete(mockReq as Request, mockRes as Response, mockNext);
      expect(hasPermission).toHaveBeenCalledWith('user-1', 'org-1', 'finance', 'delete');

      vi.clearAllMocks();
    });

    it('should allow access when module cannot be detected (backward compatibility)', async () => {
      mockReq.path = '/api/v1/unknown/path';

      const middleware = requireModuleAccess();

      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(hasPermission).not.toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalledWith();
    });
  });
});

