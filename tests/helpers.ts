import jwt from 'jsonwebtoken';
import type { Request } from 'express';
import { vi } from 'vitest';

/**
 * Generate a test JWT token
 */
export function createTestToken(payload: {
  id: string;
  email: string;
  role: string;
}): string {
  const secret = process.env.JWT_SECRET || 'test-secret-key-for-testing-only';
  return jwt.sign(payload, secret, { expiresIn: '1h' });
}

/**
 * Create authenticated request headers
 */
export function createAuthHeaders(user?: {
  id: string;
  email: string;
  role: string;
}): { Authorization: string } {
  const defaultUser = {
    id: 'test-user-id',
    email: 'test@example.com',
    role: 'user',
  };
  const token = createTestToken(user || defaultUser);
  return { Authorization: `Bearer ${token}` };
}

/**
 * Create admin authenticated request headers
 */
export function createAdminAuthHeaders(): { Authorization: string } {
  return createAuthHeaders({
    id: 'admin-user-id',
    email: 'admin@example.com',
    role: 'admin',
  });
}

/**
 * Mock Express Request with authentication
 */
export function createMockRequest(
  options: {
    user?: { id: string; email: string; role: string };
    body?: any;
    query?: any;
    params?: any;
    headers?: Record<string, string>;
  } = {}
): Partial<Request> & { user?: { id: string; email: string; role: string } } {
  const { user, body, query, params, headers } = options;
  
  const mockRequest: any = {
    body: body || {},
    query: query || {},
    params: params || {},
    headers: headers || {},
    get: vi.fn((name: string) => {
      if (name === 'authorization') {
        return user ? `Bearer ${createTestToken(user)}` : undefined;
      }
      return headers?.[name];
    }),
    ip: '::ffff:127.0.0.1',
    method: 'GET',
    path: '/test',
    url: '/test',
  };

  if (user) {
    mockRequest.user = user;
  }

  return mockRequest;
}

/**
 * Mock Express Response
 */
export function createMockResponse(): any {
  const res: any = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    send: vi.fn().mockReturnThis(),
    end: vi.fn().mockReturnThis(),
    setHeader: vi.fn().mockReturnThis(),
    getHeader: vi.fn(),
    locals: {},
  };
  return res;
}

