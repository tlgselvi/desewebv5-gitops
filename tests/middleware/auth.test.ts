import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

describe('Authentication Middleware', () => {
  const mockJwtSecret = 'test-jwt-secret-key-min-32-chars-for-testing';

  beforeEach(() => {
    process.env.JWT_SECRET = mockJwtSecret;
    vi.clearAllMocks();
  });

  it('should validate JWT token', () => {
    const token = jwt.sign(
      { id: 'test-user', email: 'test@example.com', role: 'admin' },
      mockJwtSecret,
      { expiresIn: '1h' }
    );

    const decoded = jwt.verify(token, mockJwtSecret) as any;
    expect(decoded.id).toBe('test-user');
    expect(decoded.email).toBe('test@example.com');
    expect(decoded.role).toBe('admin');
  });

  it('should reject invalid JWT token', () => {
    const invalidToken = 'invalid-token';
    
    expect(() => {
      jwt.verify(invalidToken, mockJwtSecret);
    }).toThrow();
  });

  it('should reject expired JWT token', () => {
    const expiredToken = jwt.sign(
      { id: 'test-user', email: 'test@example.com', role: 'admin' },
      mockJwtSecret,
      { expiresIn: '-1h' } // Expired token
    );

    expect(() => {
      jwt.verify(expiredToken, mockJwtSecret);
    }).toThrow();
  });
});

