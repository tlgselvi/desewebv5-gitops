import { expect, test } from '@playwright/test';
import { setupAuthInterceptor } from './helpers/auth';

test.describe('IoT & Smart Pool Module', () => {
  
  test.beforeEach(async ({ page }) => {
    await setupAuthInterceptor(page);
  });

  test('IoT Dashboard should load and show KPIs', async ({ page }) => {
    // Navigate to IoT module
    await page.goto('/dashboard/iot');
    
    // Check Header
    await expect(page.locator('h1:has-text("IoT & Cihazlar")')).toBeVisible();

    // Check KPI Cards
    await expect(page.locator('text=Aktif Cihazlar')).toBeVisible();
    await expect(page.locator('text=Anlık Sıcaklık')).toBeVisible();
    await expect(page.locator('text=pH Seviyesi')).toBeVisible();
  });

  test('Device list should be visible', async ({ page }) => {
    await page.goto('/dashboard/iot');

    // Check Device List Header
    await expect(page.locator('h3:has-text("Cihaz Listesi")')).toBeVisible();
    
    // Check "Cihaz Ekle" button
    await expect(page.locator('button:has-text("Cihaz Ekle")')).toBeVisible();
  });

  // Optional: We could test the interaction with a mock device if we can seed the DB or mock the API
  test('Should show empty state or devices', async ({ page }) => {
    await page.goto('/dashboard/iot');
    
    // Either we have a list of devices OR the empty state message
    const deviceItem = page.locator('.rounded-xl.border >> nth=0'); // First device card
    const emptyState = page.locator('text=Kayıtlı cihaz yok');
    
    // Wait for loading to finish
    await expect(page.locator('.animate-spin')).not.toBeVisible();

    // Expect one of them to be visible
    await expect(deviceItem.or(emptyState).first()).toBeVisible();
  });
});

