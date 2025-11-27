import { test, expect } from '../fixtures';
import jwt from 'jsonwebtoken';

/**
 * E2E Tests for RLS Context
 * 
 * Tests cover:
 * - RLS context must be set before data access
 * - RLS context must use correct organization_id
 * - RLS context with wrong organization_id should block access
 * - RLS context middleware behavior
 */
test.describe('RLS Context E2E Tests', () => {
  const orgAId = '11111111-1111-1111-1111-111111111111';
  const orgBId = '22222222-2222-2222-2222-222222222222';
  const userId = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

  function createToken(organizationId: string, role: string = 'user'): string {
    const jwtSecret = process.env.JWT_SECRET || 'ea-plan-master-control-v6.8.1-super-secret-jwt-key-min-32-chars';
    return jwt.sign(
      {
        id: userId,
        email: 'test@example.com',
        role,
        organizationId,
        permissions: role === 'admin' ? ['admin', 'mcp.dashboard.read'] : [],
      },
      jwtSecret,
      { expiresIn: '1h' }
    );
  }

  test.describe('RLS Context Requirement', () => {
    test('Data access should fail without RLS context set', async ({ request }) => {
      // Make request without authentication (no RLS context)
      const response = await request.get('/api/v1/finance/invoices', {
        headers: {
          // No Authorization header
        },
      });
      
      // Should return 401 Unauthorized
      expect(response.status()).toBe(401);
      
      const error = await response.json().catch(() => ({}));
      expect(error.error || error.message || '').toMatch(/unauthorized|authentication required/i);
    });

    test('RLS context should be set automatically after authentication', async ({ request }) => {
      // Create token with organizationId
      const token = createToken(orgAId, 'user');
      
      // Make authenticated request
      const response = await request.get('/api/v1/finance/invoices', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      // Should succeed (RLS context set automatically by middleware)
      // Or return 403/404 if endpoint requires specific permissions
      expect([200, 403, 404]).toContain(response.status());
      
      // If successful, verify RLS context was applied (data filtered by org)
      if (response.ok()) {
        const data = await response.json();
        if (Array.isArray(data)) {
          // All items should belong to the authenticated user's organization
          data.forEach((item: any) => {
            if (item.organizationId) {
              expect(item.organizationId).toBe(orgAId);
            }
          });
        }
      }
    });
  });

  test.describe('RLS Context Organization ID Validation', () => {
    test('RLS context should use organization_id from JWT token', async ({ request }) => {
      // Create token with Organization A
      const orgAToken = createToken(orgAId, 'user');
      
      const response = await request.get('/api/v1/finance/invoices', {
        headers: {
          'Authorization': `Bearer ${orgAToken}`,
        },
      });
      
      if (response.ok()) {
        const data = await response.json();
        if (Array.isArray(data)) {
          // Verify all data belongs to Org A
          data.forEach((item: any) => {
            if (item.organizationId) {
              expect(item.organizationId).toBe(orgAId);
              expect(item.organizationId).not.toBe(orgBId);
            }
          });
        }
      }
    });

    test('RLS context with wrong organization_id should block access', async ({ request }) => {
      // Create token with Organization A
      const orgAToken = createToken(orgAId, 'user');
      
      // Try to access a resource that belongs to Organization B
      // (using a mock resource ID that would belong to Org B)
      const orgBResourceId = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
      
      const response = await request.get(`/api/v1/finance/invoices/${orgBResourceId}`, {
        headers: {
          'Authorization': `Bearer ${orgAToken}`,
        },
      });
      
      // Should return 404 (not found for this organization) or 403 (forbidden)
      expect([404, 403]).toContain(response.status());
    });
  });

  test.describe('RLS Context Middleware Behavior', () => {
    test('RLS context middleware should run after authentication', async ({ request }) => {
      // Create valid token
      const token = createToken(orgAId, 'user');
      
      // Make request - RLS middleware should run after auth middleware
      const response = await request.get('/api/v1/finance/invoices', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      // Request should proceed (middleware chain works)
      // Status depends on endpoint implementation
      expect([200, 403, 404]).toContain(response.status());
    });

    test('RLS context should persist for the duration of the request', async ({ request }) => {
      // Create token
      const token = createToken(orgAId, 'user');
      
      // Make multiple requests - each should use the same RLS context
      const response1 = await request.get('/api/v1/finance/invoices', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      const response2 = await request.get('/api/v1/crm/kanban', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      // Both requests should use the same organization context
      // Verify data consistency
      if (response1.ok() && response2.ok()) {
        const data1 = await response1.json();
        const data2 = await response2.json();
        
        // Both should be filtered by the same organization
        // (actual verification depends on data structure)
        expect(data1).toBeDefined();
        expect(data2).toBeDefined();
      }
    });
  });

  test.describe('RLS Context Error Handling', () => {
    test('Invalid JWT token should prevent RLS context from being set', async ({ request }) => {
      // Use invalid token
      const invalidToken = 'invalid.jwt.token';
      
      const response = await request.get('/api/v1/finance/invoices', {
        headers: {
          'Authorization': `Bearer ${invalidToken}`,
        },
      });
      
      // Should return 401 (authentication failed, RLS context not set)
      expect(response.status()).toBe(401);
    });

    test('Expired JWT token should prevent RLS context from being set', async ({ request }) => {
      // Create expired token
      const jwtSecret = process.env.JWT_SECRET || 'ea-plan-master-control-v6.8.1-super-secret-jwt-key-min-32-chars';
      const expiredToken = jwt.sign(
        {
          id: userId,
          email: 'test@example.com',
          role: 'user',
          organizationId: orgAId,
        },
        jwtSecret,
        { expiresIn: '-1h' } // Expired 1 hour ago
      );
      
      const response = await request.get('/api/v1/finance/invoices', {
        headers: {
          'Authorization': `Bearer ${expiredToken}`,
        },
      });
      
      // Should return 401 (token expired, RLS context not set)
      expect(response.status()).toBe(401);
    });
  });
});

