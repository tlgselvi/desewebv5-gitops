import { test, expect } from './fixtures';

test.describe('Authentication Flow', () => {
  
  test('should allow user to login and redirect to dashboard', async ({ page }) => {
    // 1. Navigate to login page
    await page.goto('/auth/login');
    
    // 2. Fill credentials (using seeded user)
    await page.fill('input[name="email"]', 'admin@example.com');
    await page.fill('input[name="password"]', 'mock-password');
    
    // 3. Submit
    await page.click('button[type="submit"]');
    
    // 4. Verify redirect to dashboard
    await expect(page).toHaveURL(/\/dashboard/);
    
    // 5. Verify dashboard content
    await expect(page.locator('h2:has-text("CEO Dashboard")')).toBeVisible();
  });

  test('should show error on invalid credentials', async ({ page }) => {
    await page.goto('/auth/login');
    
    await page.fill('input[name="email"]', 'wrong@dese.com');
    await page.fill('input[name="password"]', 'wrongpass');
    
    await page.click('button[type="submit"]');
    
    // Expect error toast or message
    // Adjust selector based on actual UI implementation (Sonner toast usually appears in a portal)
    await expect(page.getByText(/Invalid credentials|Hatalı/i)).toBeVisible();
  });
});

