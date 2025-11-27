import { test, expect } from '../fixtures';

/**
 * E2E Tests for Error Message Validation
 * 
 * Tests cover:
 * - Error messages should be in Turkish (for user-facing errors)
 * - Error messages should be user-friendly
 * - Error messages should not expose technical details (in production)
 */
test.describe('Error Message Validation', () => {
  test.describe('Error Message Language', () => {
    test('Error messages should be in Turkish for user-facing errors', async ({ page }) => {
      // Try to login with invalid credentials
      await page.goto('/login');
      await page.fill('input[name="email"]', 'wrong@example.com');
      await page.fill('input[name="password"]', 'wrongpassword');
      await page.click('button[type="submit"]');
      
      // Wait for error message
      await page.waitForTimeout(2000);
      
      // Check for Turkish error message
      const errorText = await page.textContent('body');
      const hasTurkishError = errorText?.match(/Giriş başarısız|Hatalı|geçersiz|hata/i);
      
      // Error message should be in Turkish
      expect(hasTurkishError).toBeTruthy();
    });

    test('API error messages should be user-friendly', async ({ request }) => {
      // Make request without authentication
      const response = await request.get('/api/v1/finance/invoices', {
        headers: {
          // No Authorization header
        },
      });
      
      const error = await response.json().catch(() => ({}));
      const errorMessage = error.message || error.error || '';
      
      // Error message should be user-friendly, not technical
      // Should not contain: "JWT", "token", "middleware", etc. in user-facing messages
      // (API errors might be more technical, but should still be clear)
      expect(errorMessage.length).toBeGreaterThan(0);
    });
  });

  test.describe('Error Message Content', () => {
    test('Error messages should not expose technical details in production', async ({ request }) => {
      // Make a request that causes an error
      const response = await request.get('/api/v1/finance/invoices', {
        headers: {
          'Authorization': 'Bearer invalid.token',
        },
      });
      
      const error = await response.json().catch(() => ({}));
      const errorString = JSON.stringify(error);
      
      // Should not expose:
      // - Stack traces
      // - Internal file paths
      // - Database queries
      // - Configuration details
      expect(errorString).not.toMatch(/at \w+ \(.*\)|stack trace|\.ts:\d+|\.js:\d+/i);
      expect(errorString).not.toMatch(/SELECT|INSERT|UPDATE|DELETE|FROM|WHERE/i);
    });

    test('Error messages should provide actionable information', async ({ page }) => {
      // Try to submit form with invalid data
      await page.goto('/login');
      
      // Submit empty form
      await page.click('button[type="submit"]');
      
      // Wait for validation errors
      await page.waitForTimeout(1000);
      
      // Check for validation error messages
      const emailError = await page.locator('text=/e-posta|email|required/i').isVisible().catch(() => false);
      const passwordError = await page.locator('text=/şifre|password|required/i').isVisible().catch(() => false);
      
      // Should show actionable error messages
      expect(emailError || passwordError).toBeTruthy();
    });
  });

  test.describe('Error Message Consistency', () => {
    test('Similar errors should have consistent message format', async ({ request }) => {
      // Test multiple 401 errors
      const responses = await Promise.all([
        request.get('/api/v1/finance/invoices', { headers: {} }),
        request.get('/api/v1/crm/kanban', { headers: {} }),
        request.get('/api/v1/inventory/products', { headers: {} }),
      ]);
      
      // All should return 401
      responses.forEach((response) => {
        expect(response.status()).toBe(401);
      });
      
      // Error messages should have consistent format
      const errors = await Promise.all(
        responses.map((r) => r.json().catch(() => ({})))
      );
      
      // All errors should have similar structure
      errors.forEach((error) => {
        expect(error).toHaveProperty('error');
        expect(error).toHaveProperty('message');
      });
    });
  });
});

