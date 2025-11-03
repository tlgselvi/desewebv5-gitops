import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import { authorize } from '@/rbac/authorize.js';
import type { AuthUser } from '@/rbac/types.js';

function mockReq(user?: AuthUser, headers: Record<string, string> = {}): Request {
  return {
    user,
    headers,
    path: '/x',
  } as unknown as Request;
}

function mockRes(): Response {
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  };
  return res as unknown as Response;
}

describe('authorize', () => {
  let next: NextFunction;

  beforeEach(() => {
    next = vi.fn();
  });

  it('should reject unauthenticated requests', async () => {
    const req = mockReq();
    const res = mockRes();

    await authorize({ resource: 'finbot.accounts', action: 'read' })(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'unauthenticated' });
    expect(next).not.toHaveBeenCalled();
  });

  it('should allow dev bypass with X-Master-Control-CLI header', async () => {
    const req = mockReq(
      { id: 'test-user', roles: [] },
      { 'x-master-control-cli': 'true' }
    );
    const res = mockRes();

    await authorize({ resource: 'finbot.accounts', action: 'read' })(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('should allow admin role to access any resource', async () => {
    const req = mockReq({ id: 'admin-user', roles: ['admin'] });
    const res = mockRes();

    await authorize({ resource: 'finbot.accounts', action: 'read' })(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('should reject access when user has no matching permissions', async () => {
    const req = mockReq({ id: 'test-user', roles: ['viewer'] });
    const res = mockRes();

    // Mock DB query to return empty permissions
    vi.doMock('@/db/index.js', () => ({
      db: {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        innerJoin: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([]),
      },
    }));

    await authorize({ resource: 'finbot.accounts', action: 'write' })(req, res, next);

    // Should return 403 for write action (viewer only has read)
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: 'forbidden' });
    expect(next).not.toHaveBeenCalled();
  });
});

