import { expect, test } from '@playwright/test';
import { setupAuthInterceptor } from './helpers/auth';

test.describe('CRM Module', () => {
  
  test.beforeEach(async ({ page }) => {
    await setupAuthInterceptor(page);
  });

  test('CRM Dashboard should load', async ({ page }) => {
    await page.goto('/dashboard/crm');
    
    // Check Header
    await expect(page.locator('h1:has-text("CRM & Satış")')).toBeVisible();

    // Check KPIs
    await expect(page.locator('text=Toplam Fırsat')).toBeVisible();
    await expect(page.locator('text=Pipeline Değeri')).toBeVisible();
    await expect(page.locator('text=Kazanılan')).toBeVisible();
  });

  test('Kanban board should be visible', async ({ page }) => {
    await page.goto('/dashboard/crm');

    // Check for Kanban stages
    // Assuming stages like "Yeni Lead", "Teklif", etc. might be present, or just check the board container
    const kanbanBoard = page.locator('.flex-1.overflow-hidden'); // The container
    await expect(kanbanBoard).toBeVisible();
    
    // Check for "Yeni Fırsat" button
    await expect(page.locator('button:has-text("Yeni Fırsat")')).toBeVisible();
  });
});

