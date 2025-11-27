import { test, expect } from './fixtures';

test.describe('Dashboard Access', () => {
  // Use storage state from global setup or login before each test
  test.beforeEach(async ({ page }) => {
    await page.goto('/auth/login');
    await page.fill('input[name="email"]', 'admin@example.com');
    await page.fill('input[name="password"]', 'mock-password');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test('should display key metrics', async ({ page }) => {
    await expect(page.getByText('Toplam Ciro')).toBeVisible();
    await expect(page.getByText('Aktif Kullanıcı')).toBeVisible();
  });

  test('should navigate to Finance module', async ({ page }) => {
    await page.click('a[href="/dashboard/finance"]');
    await expect(page).toHaveURL(/\/dashboard\/finance/);
    await expect(page.getByText('Finans Yönetimi')).toBeVisible();
  });

  test('should navigate to IoT module', async ({ page }) => {
    await page.click('a[href="/dashboard/iot"]');
    await expect(page).toHaveURL(/\/dashboard\/iot/);
    await expect(page.getByText('IoT & Cihazlar')).toBeVisible();
  });
});

