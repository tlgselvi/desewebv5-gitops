/**
 * OWASP A01: Broken Access Control Tests
 * 
 * Tests for:
 * - Unauthorized access prevention
 * - Privilege escalation prevention (vertical and horizontal)
 * - IDOR (Insecure Direct Object Reference) prevention
 * - Path traversal prevention
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import express, { Application } from 'express';
import jwt from 'jsonwebtoken';
import { authenticate, authorize, RequestWithUser } from '@/middleware/auth.js';
import { createTestApp } from './helpers/test-app-helper.js';
import { SecurityTestFramework, AttackPayloadGenerator, AuthHelper, ResponseValidator } from './security-test-framework.js';

describe('OWASP A01: Broken Access Control', () => {
  let app: Application;
  let framework: SecurityTestFramework;
  const mockJwtSecret = 'test-jwt-secret-key-min-32-chars-for-testing';

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.JWT_SECRET = mockJwtSecret;
    app = createTestApp();
    framework = new SecurityTestFramework(app);
  });

  /**
   * Helper function to create a valid JWT token
   */
  function createToken(payload: {
    id: string;
    email: string;
    role: string;
    organizationId?: string;
  }): string {
    return jwt.sign(payload, mockJwtSecret, { expiresIn: '1h' });
  }

  /**
   * Helper function to create an expired token
   */
  function createExpiredToken(payload: {
    id: string;
    email: string;
    role: string;
  }): string {
    return jwt.sign(payload, mockJwtSecret, { expiresIn: '-1h' });
  }

  describe('Unauthorized Access', () => {
    it('should reject access without authentication token', async () => {
      // Create a protected endpoint
      app.get('/api/v1/protected', authenticate, (req, res) => {
        res.json({ message: 'Protected resource' });
      });

      const response = await request(app)
        .get('/api/v1/protected')
        .expect(401);

      expect(response.body.error).toBeDefined();
    });

    it('should reject access with invalid token', async () => {
      app.get('/api/v1/protected', authenticate, (req, res) => {
        res.json({ message: 'Protected resource' });
      });

      const response = await request(app)
        .get('/api/v1/protected')
        .set('Authorization', 'Bearer invalid-token-12345')
        .expect(401);

      expect(response.body.error).toBeDefined();
    });

    it('should reject access with expired token', async () => {
      const expiredToken = createExpiredToken({
        id: 'user-1',
        email: 'user@example.com',
        role: 'user',
      });

      app.get('/api/v1/protected', authenticate, (req, res) => {
        res.json({ message: 'Protected resource' });
      });

      const response = await request(app)
        .get('/api/v1/protected')
        .set('Authorization', `Bearer ${expiredToken}`)
        .expect(401);

      expect(response.body.error).toBeDefined();
    });

    it('should reject access with malformed token', async () => {
      app.get('/api/v1/protected', authenticate, (req, res) => {
        res.json({ message: 'Protected resource' });
      });

      const response = await request(app)
        .get('/api/v1/protected')
        .set('Authorization', 'Bearer not.a.valid.jwt.token')
        .expect(401);

      expect(response.body.error).toBeDefined();
    });

    it('should reject access without Bearer prefix', async () => {
      const token = createToken({
        id: 'user-1',
        email: 'user@example.com',
        role: 'user',
      });

      app.get('/api/v1/protected', authenticate, (req, res) => {
        res.json({ message: 'Protected resource' });
      });

      const response = await request(app)
        .get('/api/v1/protected')
        .set('Authorization', token) // Missing "Bearer " prefix
        .expect(401);

      expect(response.body.error).toBeDefined();
    });
  });

  describe('Privilege Escalation - Vertical', () => {
    it('should prevent user from accessing admin endpoints', async () => {
      const userToken = createToken({
        id: 'user-1',
        email: 'user@example.com',
        role: 'user',
      });

      app.delete('/api/v1/admin/users/:id', authenticate, authorize(['admin']), (req, res) => {
        res.json({ message: 'User deleted' });
      });

      const response = await request(app)
        .delete('/api/v1/admin/users/123')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);

      expect(response.body.error).toBeDefined();
    });

    it('should prevent user from creating admin users', async () => {
      const userToken = createToken({
        id: 'user-1',
        email: 'user@example.com',
        role: 'user',
      });

      app.post('/api/v1/admin/users', authenticate, authorize(['admin']), (req, res) => {
        res.json({ message: 'User created' });
      });

      const response = await request(app)
        .post('/api/v1/admin/users')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          email: 'newadmin@example.com',
          role: 'admin',
        })
        .expect(403);

      expect(response.body.error).toBeDefined();
    });

    it('should prevent user from modifying admin settings', async () => {
      const userToken = createToken({
        id: 'user-1',
        email: 'user@example.com',
        role: 'user',
      });

      app.put('/api/v1/admin/settings', authenticate, authorize(['admin']), (req, res) => {
        res.json({ message: 'Settings updated' });
      });

      const response = await request(app)
        .put('/api/v1/admin/settings')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ maintenanceMode: false })
        .expect(403);

      expect(response.body.error).toBeDefined();
    });

    it('should allow admin to access admin endpoints', async () => {
      const adminToken = createToken({
        id: 'admin-1',
        email: 'admin@example.com',
        role: 'admin',
      });

      app.get('/api/v1/admin/users', authenticate, authorize(['admin']), (req, res) => {
        res.json({ users: [] });
      });

      const response = await request(app)
        .get('/api/v1/admin/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.users).toBeDefined();
    });
  });

  describe('Privilege Escalation - Horizontal', () => {
    it('should prevent user from accessing other organization data', async () => {
      const user1Token = createToken({
        id: 'user-1',
        email: 'user1@example.com',
        role: 'user',
        organizationId: 'org-1',
      });

      app.get('/api/v1/finance/accounts', authenticate, (req, res) => {
        const reqWithUser = req as RequestWithUser;
        const userOrgId = reqWithUser.user?.organizationId;
        
        // Simulate RLS check
        const requestedOrgId = req.query.organizationId as string;
        if (requestedOrgId && requestedOrgId !== userOrgId) {
          return res.status(403).json({ error: 'Forbidden: Cannot access other organization data' });
        }
        
        res.json({ accounts: [] });
      });

      const response = await request(app)
        .get('/api/v1/finance/accounts')
        .set('Authorization', `Bearer ${user1Token}`)
        .query({ organizationId: 'org-2' })
        .expect(403);

      expect(response.body.error).toBeDefined();
    });

    it('should prevent user from modifying other user profile', async () => {
      const user1Token = createToken({
        id: 'user-1',
        email: 'user1@example.com',
        role: 'user',
      });

      app.put('/api/v1/users/:id', authenticate, (req, res) => {
        const reqWithUser = req as RequestWithUser;
        const userId = req.params.id;
        const currentUserId = reqWithUser.user?.id;
        
        // Check if user is trying to modify their own profile
        if (userId !== currentUserId) {
          return res.status(403).json({ error: 'Forbidden: Cannot modify other user profile' });
        }
        
        res.json({ message: 'Profile updated' });
      });

      const response = await request(app)
        .put('/api/v1/users/user-2')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({ name: 'Hacked User 2' })
        .expect(403);

      expect(response.body.error).toBeDefined();
    });

    it('should allow user to modify their own profile', async () => {
      const user1Token = createToken({
        id: 'user-1',
        email: 'user1@example.com',
        role: 'user',
      });

      app.put('/api/v1/users/:id', authenticate, (req, res) => {
        const reqWithUser = req as RequestWithUser;
        const userId = req.params.id;
        const currentUserId = reqWithUser.user?.id;
        
        if (userId !== currentUserId) {
          return res.status(403).json({ error: 'Forbidden' });
        }
        
        res.json({ message: 'Profile updated' });
      });

      const response = await request(app)
        .put('/api/v1/users/user-1')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({ name: 'Updated Name' })
        .expect(200);

      expect(response.body.message).toBe('Profile updated');
    });
  });

  describe('IDOR (Insecure Direct Object Reference)', () => {
    it('should prevent access to other users resources by ID manipulation', async () => {
      const user1Token = createToken({
        id: 'user-1',
        email: 'user1@example.com',
        role: 'user',
        organizationId: 'org-1',
      });

      const user2Token = createToken({
        id: 'user-2',
        email: 'user2@example.com',
        role: 'user',
        organizationId: 'org-1',
      });

      // Create resource for user-1
      let resourceId: string;
      app.post('/api/v1/resources', authenticate, (req, res) => {
        const reqWithUser = req as RequestWithUser;
        resourceId = `resource-${reqWithUser.user?.id}`;
        res.json({ id: resourceId, userId: reqWithUser.user?.id });
      });

      // User-1 creates a resource
      const createResponse = await request(app)
        .post('/api/v1/resources')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({ name: 'User1 Resource' })
        .expect(201);

      resourceId = createResponse.body.id;

      // User-2 tries to access user-1's resource
      app.get('/api/v1/resources/:id', authenticate, (req, res) => {
        const reqWithUser = req as RequestWithUser;
        const resourceId = req.params.id;
        const userId = reqWithUser.user?.id;
        
        // Extract user ID from resource ID (simulating ownership check)
        const resourceOwnerId = resourceId.replace('resource-', '');
        if (resourceOwnerId !== userId) {
          return res.status(403).json({ error: 'Forbidden: Cannot access other user resource' });
        }
        
        res.json({ id: resourceId, userId });
      });

      const response = await request(app)
        .get(`/api/v1/resources/${resourceId}`)
        .set('Authorization', `Bearer ${user2Token}`)
        .expect(403);

      expect(response.body.error).toBeDefined();
    });

    it('should prevent deletion of other users resources', async () => {
      const user1Token = createToken({
        id: 'user-1',
        email: 'user1@example.com',
        role: 'user',
      });

      const user2Token = createToken({
        id: 'user-2',
        email: 'user2@example.com',
        role: 'user',
      });

      let resourceId: string;
      app.post('/api/v1/resources', authenticate, (req, res) => {
        const reqWithUser = req as RequestWithUser;
        resourceId = `resource-${reqWithUser.user?.id}`;
        res.json({ id: resourceId });
      });

      const createResponse = await request(app)
        .post('/api/v1/resources')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({ name: 'User1 Resource' })
        .expect(201);

      resourceId = createResponse.body.id;

      app.delete('/api/v1/resources/:id', authenticate, (req, res) => {
        const reqWithUser = req as RequestWithUser;
        const resourceId = req.params.id;
        const userId = reqWithUser.user?.id;
        
        const resourceOwnerId = resourceId.replace('resource-', '');
        if (resourceOwnerId !== userId) {
          return res.status(403).json({ error: 'Forbidden' });
        }
        
        res.json({ message: 'Resource deleted' });
      });

      const response = await request(app)
        .delete(`/api/v1/resources/${resourceId}`)
        .set('Authorization', `Bearer ${user2Token}`)
        .expect(403);

      expect(response.body.error).toBeDefined();
    });
  });

  describe('Path Traversal', () => {
    it('should prevent path traversal attacks in file access', async () => {
      const userToken = createToken({
        id: 'user-1',
        email: 'user@example.com',
        role: 'user',
      });

      const maliciousPaths = AttackPayloadGenerator.getPathTraversalPayloads();

      app.get('/api/v1/files/:path', authenticate, (req, res) => {
        const filePath = req.params.path;
        
        // Check for path traversal patterns
        if (filePath.includes('..') || filePath.includes('\\') || filePath.startsWith('/')) {
          return res.status(400).json({ error: 'Invalid file path' });
        }
        
        res.json({ path: filePath });
      });

      for (const maliciousPath of maliciousPaths) {
        const response = await request(app)
          .get(`/api/v1/files/${encodeURIComponent(maliciousPath)}`)
          .set('Authorization', `Bearer ${userToken}`)
          .expect(400);

        expect(response.body.error).toBeDefined();
      }
    });

    it('should sanitize file paths', async () => {
      const userToken = createToken({
        id: 'user-1',
        email: 'user@example.com',
        role: 'user',
      });

      const testPaths = [
        '../../etc/passwd',
        '..\\..\\windows\\system32',
        '/etc/shadow',
        'C:\\Windows\\System32',
      ];

      app.get('/api/v1/files/:path', authenticate, (req, res) => {
        const filePath = req.params.path;
        
        // Sanitize path
        if (filePath.includes('..') || filePath.includes('\\') || filePath.startsWith('/')) {
          return res.status(400).json({ error: 'Invalid file path' });
        }
        
        res.json({ path: filePath });
      });

      for (const path of testPaths) {
        const response = await request(app)
          .get(`/api/v1/files/${encodeURIComponent(path)}`)
          .set('Authorization', `Bearer ${userToken}`)
          .expect(400);

        expect(response.body.error).toBeDefined();
      }
    });
  });

  describe('Security Headers Validation', () => {
    it('should include security headers in responses', async () => {
      app.get('/api/v1/public', (req, res) => {
        res.json({ message: 'Public endpoint' });
      });

      const response = await request(app)
        .get('/api/v1/public')
        .expect(200);

      const headerValidation = ResponseValidator.validateSecurityHeaders(response);
      expect(headerValidation.valid).toBe(true);
      expect(headerValidation.missing).toHaveLength(0);
    });
  });

  describe('Sensitive Data Leak Prevention', () => {
    it('should not leak sensitive information in error messages', async () => {
      app.get('/api/v1/error-test', authenticate, (req, res) => {
        // Simulate an error that might leak sensitive data
        res.status(500).json({
          error: 'Internal server error',
          message: 'An error occurred',
          // Should NOT include: password, secret, api_key, etc.
        });
      });

      const userToken = createToken({
        id: 'user-1',
        email: 'user@example.com',
        role: 'user',
      });

      const response = await request(app)
        .get('/api/v1/error-test')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(500);

      const noLeak = ResponseValidator.validateNoSensitiveDataLeak(response);
      expect(noLeak).toBe(true);
    });
  });
});

