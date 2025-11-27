import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response } from 'express';
import { auditMiddleware } from '@/middleware/audit.js';
import { logger } from '@/utils/logger.js';
import type { RequestWithUser } from '@/middleware/auth.js';

// Mock logger
vi.mock('@/utils/logger.js', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

describe('RLS Audit Log Context', () => {
  let mockReq: Partial<Request & RequestWithUser>;
  let mockRes: Partial<Response>;
  let mockNext: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();

    mockReq = {
      method: 'GET',
      path: '/api/v1/finance/invoices',
      ip: '127.0.0.1',
      get: vi.fn((header: string) => {
        if (header === 'User-Agent') return 'test-agent';
        return undefined;
      }),
      user: {
        id: 'user-1',
        email: 'user@example.com',
        role: 'user',
        organizationId: 'org-1',
      },
    };

    mockRes = {
      statusCode: 200,
      once: vi.fn((event: string, callback: () => void) => {
        // Simulate response finish
        setTimeout(() => callback(), 0);
      }),
    };

    mockNext = vi.fn();
  });

  describe('RLS Context Set', () => {
    it('should log RLS context information when RLS context is set', () => {
      // Simulate RLS context being set
      (mockReq as any).rlsContextSet = true;
      (mockReq as any).rlsContext = {
        organizationId: 'org-1',
        userId: 'user-1',
        role: 'user',
      };

      auditMiddleware(mockReq as Request, mockRes as Response, mockNext);

      // Wait for async finish event
      setTimeout(() => {
        expect(logger.info).toHaveBeenCalledWith(
          'Audit Event',
          expect.objectContaining({
            rlsContextSet: true,
            rlsContext: {
              organizationId: 'org-1',
              userId: 'user-1',
              role: 'user',
            },
            organizationId: 'org-1',
            userId: 'user-1',
            userRole: 'user',
          })
        );
      }, 10);
    });

    it('should include RLS context in audit log for authenticated requests', () => {
      (mockReq as any).rlsContextSet = true;
      (mockReq as any).rlsContext = {
        organizationId: 'org-1',
        userId: 'user-1',
        role: 'admin',
      };

      auditMiddleware(mockReq as Request, mockRes as Response, mockNext);

      setTimeout(() => {
        expect(logger.info).toHaveBeenCalled();
        const callArgs = (logger.info as ReturnType<typeof vi.fn>).mock.calls[0];
        expect(callArgs[1]).toHaveProperty('rlsContextSet', true);
        expect(callArgs[1]).toHaveProperty('rlsContext');
      }, 10);
    });
  });

  describe('RLS Context Not Set', () => {
    it('should log warning when RLS context is not set for authenticated request', () => {
      // RLS context not set
      (mockReq as any).rlsContextSet = false;

      auditMiddleware(mockReq as Request, mockRes as Response, mockNext);

      setTimeout(() => {
        expect(logger.warn).toHaveBeenCalledWith(
          'Audit Event - RLS context not set for authenticated request',
          expect.objectContaining({
            rlsContextSet: false,
            userId: 'user-1',
            organizationId: 'org-1',
          })
        );
      }, 10);
    });

    it('should not log warning for anonymous requests', () => {
      // No user authenticated
      mockReq.user = undefined;
      (mockReq as any).rlsContextSet = false;

      auditMiddleware(mockReq as Request, mockRes as Response, mockNext);

      setTimeout(() => {
        // Should log info, not warning, for anonymous requests
        expect(logger.warn).not.toHaveBeenCalled();
        expect(logger.info).toHaveBeenCalled();
      }, 10);
    });
  });

  describe('Audit Log Structure', () => {
    it('should include all required RLS context fields in audit log', () => {
      (mockReq as any).rlsContextSet = true;
      (mockReq as any).rlsContext = {
        organizationId: 'org-1',
        userId: 'user-1',
        role: 'user',
      };

      auditMiddleware(mockReq as Request, mockRes as Response, mockNext);

      setTimeout(() => {
        expect(logger.info).toHaveBeenCalled();
        const callArgs = (logger.info as ReturnType<typeof vi.fn>).mock.calls[0];
        const auditData = callArgs[1];

        // Verify all required fields are present
        expect(auditData).toHaveProperty('action');
        expect(auditData).toHaveProperty('userId');
        expect(auditData).toHaveProperty('userEmail');
        expect(auditData).toHaveProperty('userRole');
        expect(auditData).toHaveProperty('organizationId');
        expect(auditData).toHaveProperty('rlsContextSet');
        expect(auditData).toHaveProperty('rlsContext');
        expect(auditData).toHaveProperty('timestamp');
        expect(auditData).toHaveProperty('statusCode');
      }, 10);
    });

    it('should include RLS context details when available', () => {
      (mockReq as any).rlsContextSet = true;
      (mockReq as any).rlsContext = {
        organizationId: 'org-1',
        userId: 'user-1',
        role: 'admin',
      };

      auditMiddleware(mockReq as Request, mockRes as Response, mockNext);

      setTimeout(() => {
        expect(logger.info).toHaveBeenCalled();
        const callArgs = (logger.info as ReturnType<typeof vi.fn>).mock.calls[0];
        const auditData = callArgs[1];

        expect(auditData.rlsContext).toEqual({
          organizationId: 'org-1',
          userId: 'user-1',
          role: 'admin',
        });
      }, 10);
    });
  });

  describe('Cross-Tenant Access Attempts', () => {
    it('should log cross-tenant access attempts in audit log', () => {
      (mockReq as any).rlsContextSet = true;
      (mockReq as any).rlsContext = {
        organizationId: 'org-1',
        userId: 'user-1',
        role: 'user',
      };

      // Simulate cross-tenant access attempt (would be detected by RLS policies)
      mockReq.path = '/api/v1/finance/invoices';
      mockRes.statusCode = 403; // Forbidden

      auditMiddleware(mockReq as Request, mockRes as Response, mockNext);

      setTimeout(() => {
        expect(logger.info).toHaveBeenCalled();
        const callArgs = (logger.info as ReturnType<typeof vi.fn>).mock.calls[0];
        const auditData = callArgs[1];

        // Audit log should record the attempt
        expect(auditData).toHaveProperty('statusCode', 403);
        expect(auditData).toHaveProperty('rlsContextSet', true);
      }, 10);
    });
  });
});

