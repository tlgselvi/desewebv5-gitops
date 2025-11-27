import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { setRLSContextMiddleware } from '@/middleware/rls.js';
import { setRLSContext } from '@/db/rls-helper.js';
import type { RequestWithUser } from '@/middleware/auth.js';

// Mock RLS helper
vi.mock('@/db/rls-helper.js', () => ({
  setRLSContext: vi.fn(),
}));

// Mock logger
vi.mock('@/utils/logger.js', () => ({
  logger: {
    debug: vi.fn(),
    error: vi.fn(),
  },
}));

describe('RLS Middleware', () => {
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
    };

    mockRes = {};

    mockNext = vi.fn();
  });

  it('should set RLS context for authenticated user', async () => {
    vi.mocked(setRLSContext).mockResolvedValue(undefined);

    await setRLSContextMiddleware(mockReq as Request, mockRes as Response, mockNext);

    expect(setRLSContext).toHaveBeenCalledWith('org-1', 'user-1', 'admin');
    expect(mockNext).toHaveBeenCalledWith();
  });

  it('should skip RLS context when user is not authenticated', async () => {
    delete mockReq.user;

    await setRLSContextMiddleware(mockReq as Request, mockRes as Response, mockNext);

    expect(setRLSContext).not.toHaveBeenCalled();
    expect(mockNext).toHaveBeenCalledWith();
  });

  it('should continue even if RLS context setting fails', async () => {
    vi.mocked(setRLSContext).mockRejectedValue(new Error('Database error'));

    await setRLSContextMiddleware(mockReq as Request, mockRes as Response, mockNext);

    expect(setRLSContext).toHaveBeenCalled();
    expect(mockNext).toHaveBeenCalledWith();
  });
});

