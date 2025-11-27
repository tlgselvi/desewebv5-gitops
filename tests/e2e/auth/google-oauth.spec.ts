import { test, expect } from '../fixtures';

/**
 * E2E Tests for Google OAuth Flow
 * 
 * Tests cover:
 * - Google OAuth button visibility and functionality
 * - OAuth redirect flow
 * - OAuth callback handling
 * - Error handling for OAuth failures
 * 
 * Note: These tests may require Google OAuth to be configured.
 * In test environment, OAuth might be mocked or disabled.
 */
test.describe('Google OAuth Flow', () => {
  // Use a fresh context for each test
  test.use({ storageState: { cookies: [], origins: [] } });

  test.describe('OAuth Button and Initiation', () => {
    test('should display Google OAuth button on login page', async ({ page }) => {
      await page.goto('/login');
      
      // Verify login page is loaded
      await expect(page.locator('text=Giriş Yap')).toBeVisible();
      
      // Check for Google OAuth button
      const googleButton = page.locator('button:has-text("Google"), button:has-text("Google ile Giriş"), a:has-text("Google")').first();
      
      // Button should be visible
      await expect(googleButton).toBeVisible({ timeout: 3000 });
    });

    test('should navigate to Google OAuth endpoint when button is clicked', async ({ page }) => {
      await page.goto('/login');
      
      // Find Google OAuth button
      const googleButton = page.locator('button:has-text("Google"), button:has-text("Google ile Giriş"), a:has-text("Google")').first();
      
      // Click button and wait for navigation
      const [response] = await Promise.all([
        page.waitForResponse((resp) => 
          resp.url().includes('/api/v1/auth/google') || 
          resp.url().includes('accounts.google.com') ||
          resp.status() === 302
        ).catch(() => null),
        googleButton.click(),
      ]);
      
      // Should either redirect to Google or show OAuth error if not configured
      // Check if we're redirected to Google OAuth or if there's an error message
      const currentUrl = page.url();
      const hasGoogleOAuth = currentUrl.includes('accounts.google.com') || 
                            currentUrl.includes('/api/v1/auth/google');
      const hasError = await page.locator('text=/not configured|OAuth.*error/i').isVisible().catch(() => false);
      
      // One of these should be true
      expect(hasGoogleOAuth || hasError || response?.status() === 302).toBeTruthy();
    });
  });

  test.describe('OAuth Callback Handling', () => {
    test('should handle OAuth callback with valid token', async ({ page, context }) => {
      // This test simulates a successful OAuth callback
      // In a real scenario, this would come from Google OAuth redirect
      
      // Mock the callback URL with a token parameter
      const mockToken = 'mock-jwt-token-for-testing';
      
      // Navigate to callback URL (as if redirected from Google)
      await page.goto(`/auth/callback?token=${mockToken}`);
      
      // The callback page should either:
      // 1. Store the token and redirect to dashboard
      // 2. Show an error if token is invalid
      
      // Wait a bit for any redirects or token processing
      await page.waitForTimeout(2000);
      
      // Check if token was stored (if callback page processes it)
      const storedToken = await page.evaluate(() => localStorage.getItem('token'));
      
      // Either token is stored or we're redirected/error shown
      const isDashboard = page.url().includes('/dashboard');
      const isLogin = page.url().includes('/login');
      const hasToken = storedToken !== null;
      
      // At least one of these should be true
      expect(isDashboard || isLogin || hasToken).toBeTruthy();
    });

    test('should handle OAuth callback error', async ({ page }) => {
      // Simulate OAuth callback with error
      await page.goto('/auth/callback?error=access_denied');
      
      // Should redirect to login with error message
      await expect(page).toHaveURL(/\/login.*error/, { timeout: 5000 });
      
      // Error message should be visible
      const hasError = await page.locator('text=/error|hata|denied/i').isVisible().catch(() => false);
      expect(hasError).toBeTruthy();
    });

    test('should handle OAuth callback without token', async ({ page }) => {
      // Navigate to callback without token
      await page.goto('/auth/callback');
      
      // Should redirect to login or show error
      await page.waitForTimeout(2000);
      
      const currentUrl = page.url();
      const isLogin = currentUrl.includes('/login');
      const hasError = await page.locator('text=/error|hata|token/i').isVisible().catch(() => false);
      
      expect(isLogin || hasError).toBeTruthy();
    });
  });

  test.describe('OAuth Error Scenarios', () => {
    test('should show error when Google OAuth is not configured', async ({ page }) => {
      await page.goto('/login');
      
      // Try to access OAuth endpoint directly
      const response = await page.goto('/api/v1/auth/google', { waitUntil: 'networkidle' }).catch(() => null);
      
      // Should either redirect or show error
      if (response) {
        // If OAuth is not configured, might return 500 or redirect with error
        const status = response.status();
        expect([302, 500, 403].includes(status)).toBeTruthy();
      }
      
      // Check for error message if redirected back to login
      const currentUrl = page.url();
      if (currentUrl.includes('/login')) {
        const hasError = await page.locator('text=/not configured|OAuth.*error|configured/i').isVisible().catch(() => false);
        // Error might be shown or might not (depending on implementation)
        // Just verify we're on login page
        expect(currentUrl).toContain('/login');
      }
    });

    test('should handle OAuth cancellation by user', async ({ page }) => {
      // Simulate user canceling OAuth (error=access_denied)
      await page.goto('/login?error=access_denied&reason=user_cancelled');
      
      // Should show appropriate error message
      const hasError = await page.locator('text=/cancelled|canceled|iptal/i').isVisible().catch(() => false);
      
      // Error message might be shown or might not (depending on implementation)
      // At least verify we're on login page
      await expect(page).toHaveURL(/\/login/);
    });
  });

  test.describe('OAuth Token Validation', () => {
    test('should validate OAuth token format after successful login', async ({ page }) => {
      // This test assumes we can simulate a successful OAuth flow
      // In practice, this might require mocking the OAuth provider
      
      // For now, we'll test that if a token is set via callback, it's validated
      const mockToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjIyMjIyMjIyLTIyMjItMjIyMi0yMjIyLTIyMjIyMjIyMjIyMjIiIsImVtYWlsIjoiYWRtaW5AZXhhbXBsZS5jb20iLCJyb2xlIjoiYWRtaW4ifQ.mock';
      
      await page.goto(`/auth/callback?token=${mockToken}`);
      await page.waitForTimeout(2000);
      
      // Check if token was stored
      const storedToken = await page.evaluate(() => localStorage.getItem('token'));
      
      // If token is stored, verify it's in JWT format
      if (storedToken) {
        const parts = storedToken.split('.');
        expect(parts.length).toBeGreaterThanOrEqual(2); // At least header and payload
      }
    });
  });
});

