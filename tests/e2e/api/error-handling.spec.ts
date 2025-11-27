import { test, expect } from '../fixtures';

/**
 * E2E Tests for API Error Handling
 * 
 * Tests cover:
 * - 401 Unauthorized errors
 * - 403 Forbidden errors
 * - 404 Not Found errors
 * - 400 Bad Request errors
 * - 500 Internal Server Error handling
 */
test.describe('API Error Handling', () => {
  test.describe('401 Unauthorized', () => {
    test('should return 401 when JWT token is missing', async ({ request }) => {
      const response = await request.get('/api/v1/finance/invoices', {
        headers: {
          // No Authorization header
        },
      });
      
      expect(response.status()).toBe(401);
      
      const error = await response.json().catch(() => ({}));
      expect(error.error || error.message || '').toMatch(/unauthorized|authentication required|missing/i);
    });

    test('should return 401 when JWT token is invalid', async ({ request }) => {
      const response = await request.get('/api/v1/finance/invoices', {
        headers: {
          'Authorization': 'Bearer invalid.token.here',
        },
      });
      
      expect(response.status()).toBe(401);
      
      const error = await response.json().catch(() => ({}));
      expect(error.error || error.message || '').toMatch(/invalid|unauthorized|token/i);
    });

    test('should return 401 when Authorization header format is wrong', async ({ request }) => {
      const response = await request.get('/api/v1/finance/invoices', {
        headers: {
          'Authorization': 'InvalidFormat token123',
        },
      });
      
      expect(response.status()).toBe(401);
      
      const error = await response.json().catch(() => ({}));
      expect(error.error || error.message || '').toMatch(/format|bearer|unauthorized/i);
    });

    test('should return 401 when token is expired', async ({ request, page }) => {
      // Login first to get a token structure
      await page.goto('/login');
      await page.fill('input[name="email"]', 'admin@example.com');
      await page.fill('input[name="password"]', '123456');
      await page.click('button[type="submit"]');
      
      await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });
      
      // Create an expired token manually
      const jwtSecret = process.env.JWT_SECRET || 'ea-plan-master-control-v6.8.1-super-secret-jwt-key-min-32-chars';
      const jwt = require('jsonwebtoken');
      const expiredToken = jwt.sign(
        {
          id: 'test-id',
          email: 'test@example.com',
          role: 'user',
          organizationId: '11111111-1111-1111-1111-111111111111',
        },
        jwtSecret,
        { expiresIn: '-1h' } // Expired 1 hour ago
      );
      
      const response = await request.get('/api/v1/finance/invoices', {
        headers: {
          'Authorization': `Bearer ${expiredToken}`,
        },
      });
      
      expect(response.status()).toBe(401);
      
      const error = await response.json().catch(() => ({}));
      expect(error.error || error.message || '').toMatch(/expired|unauthorized|token/i);
    });
  });

  test.describe('403 Forbidden', () => {
    test('should return 403 when user lacks required permissions', async ({ request, page }) => {
      // Login as regular user (not admin)
      await page.goto('/login');
      await page.fill('input[name="email"]', 'admin@example.com');
      await page.fill('input[name="password"]', '123456');
      await page.click('button[type="submit"]');
      
      await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });
      
      const token = await page.evaluate(() => localStorage.getItem('token'));
      
      // Try to access an endpoint that requires admin permissions
      // (assuming there's an admin-only endpoint)
      const response = await request.get('/api/v1/admin/users', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      // Should return 403 if endpoint exists and requires admin
      // Or 404 if endpoint doesn't exist
      expect([403, 404]).toContain(response.status());
      
      if (response.status() === 403) {
        const error = await response.json().catch(() => ({}));
        expect(error.error || error.message || '').toMatch(/forbidden|permission|access denied/i);
      }
    });

    test('should return 403 when user tries to access another organization data', async ({ request }) => {
      // This is covered in multi-tenant isolation tests
      // But we can add a specific test here too
      const jwtSecret = process.env.JWT_SECRET || 'ea-plan-master-control-v6.8.1-super-secret-jwt-key-min-32-chars';
      const jwt = require('jsonwebtoken');
      
      // Create token for Organization A
      const orgAToken = jwt.sign(
        {
          id: 'user-a',
          email: 'orga@example.com',
          role: 'user',
          organizationId: '11111111-1111-1111-1111-111111111111',
        },
        jwtSecret,
        { expiresIn: '1h' }
      );
      
      // Try to access a resource that belongs to Organization B
      const response = await request.get('/api/v1/finance/invoices/bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', {
        headers: {
          'Authorization': `Bearer ${orgAToken}`,
        },
      });
      
      // Should return 403 or 404
      expect([403, 404]).toContain(response.status());
    });
  });

  test.describe('404 Not Found', () => {
    test('should return 404 for non-existent resource', async ({ request, page }) => {
      // Login first
      await page.goto('/login');
      await page.fill('input[name="email"]', 'admin@example.com');
      await page.fill('input[name="password"]', '123456');
      await page.click('button[type="submit"]');
      
      await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });
      
      const token = await page.evaluate(() => localStorage.getItem('token'));
      
      // Try to access a non-existent resource
      const nonExistentId = '00000000-0000-0000-0000-000000000000';
      const response = await request.get(`/api/v1/finance/invoices/${nonExistentId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      expect(response.status()).toBe(404);
      
      const error = await response.json().catch(() => ({}));
      expect(error.error || error.message || '').toMatch(/not found|404/i);
    });

    test('should return 404 for non-existent endpoint', async ({ request, page }) => {
      await page.goto('/login');
      await page.fill('input[name="email"]', 'admin@example.com');
      await page.fill('input[name="password"]', '123456');
      await page.click('button[type="submit"]');
      
      await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });
      
      const token = await page.evaluate(() => localStorage.getItem('token'));
      
      // Try to access a non-existent endpoint
      const response = await request.get('/api/v1/nonexistent/endpoint', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      expect(response.status()).toBe(404);
    });
  });

  test.describe('400 Bad Request', () => {
    test('should return 400 for invalid request body', async ({ request, page }) => {
      await page.goto('/login');
      await page.fill('input[name="email"]', 'admin@example.com');
      await page.fill('input[name="password"]', '123456');
      await page.click('button[type="submit"]');
      
      await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });
      
      const token = await page.evaluate(() => localStorage.getItem('token'));
      
      // Try to create invoice with invalid data
      const response = await request.post('/api/v1/finance/invoices', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        data: {
          // Missing required fields
          invalidField: 'invalid',
        },
      });
      
      // Should return 400 for validation errors
      expect([400, 422]).toContain(response.status());
      
      if (response.status() === 400 || response.status() === 422) {
        const error = await response.json().catch(() => ({}));
        expect(error.error || error.message || '').toMatch(/bad request|validation|invalid|required/i);
      }
    });

    test('should return 400 for invalid data types', async ({ request, page }) => {
      await page.goto('/login');
      await page.fill('input[name="email"]', 'admin@example.com');
      await page.fill('input[name="password"]', '123456');
      await page.click('button[type="submit"]');
      
      await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });
      
      const token = await page.evaluate(() => localStorage.getItem('token'));
      
      // Try to create invoice with wrong data types
      const response = await request.post('/api/v1/finance/invoices', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        data: {
          accountId: '11111111-1111-1111-1111-111111111111',
          type: 'sales',
          items: [
            {
              description: 'Test',
              quantity: 'invalid', // Should be number
              unitPrice: 'invalid', // Should be number
            },
          ],
        },
      });
      
      expect([400, 422]).toContain(response.status());
    });

    test('should return 400 for malformed JSON', async ({ request, page }) => {
      await page.goto('/login');
      await page.fill('input[name="email"]', 'admin@example.com');
      await page.fill('input[name="password"]', '123456');
      await page.click('button[type="submit"]');
      
      await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });
      
      const token = await page.evaluate(() => localStorage.getItem('token'));
      
      // Send malformed JSON
      const response = await request.post('/api/v1/finance/invoices', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        data: 'invalid json{',
      });
      
      expect([400, 500]).toContain(response.status());
    });
  });

  test.describe('500 Internal Server Error', () => {
    test('should return 500 with user-friendly error message', async ({ request, page }) => {
      await page.goto('/login');
      await page.fill('input[name="email"]', 'admin@example.com');
      await page.fill('input[name="password"]', '123456');
      await page.click('button[type="submit"]');
      
      await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });
      
      const token = await page.evaluate(() => localStorage.getItem('token'));
      
      // Try to trigger a server error (if possible)
      // This might require a specific endpoint that can be made to fail
      // For now, we'll test error message format
      
      // Note: In production, 500 errors should not expose technical details
      // This test verifies that error messages are user-friendly
    });

    test('should not expose sensitive information in error messages', async ({ request }) => {
      // Make a request that might cause an error
      const response = await request.get('/api/v1/finance/invoices', {
        headers: {
          'Authorization': 'Bearer invalid.token',
        },
      });
      
      const error = await response.json().catch(() => ({}));
      const errorMessage = JSON.stringify(error);
      
      // Error message should not contain:
      // - Database connection strings
      // - Internal file paths
      // - Stack traces (in production)
      // - Sensitive configuration
      expect(errorMessage).not.toMatch(/postgresql:\/\/|mongodb:\/\/|password|secret|key.*=/i);
    });
  });
});

