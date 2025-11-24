import { expect, test } from '@playwright/test';
import { setupAuthInterceptor } from './helpers/auth';

test.describe('External Integrations & IoT', () => {
  
  test.beforeEach(async ({ page }) => {
    await setupAuthInterceptor(page);
  });

  test('TCMB Exchange Rates Widget should be visible on Finance Dashboard', async ({ page }) => {
    // Navigate to Finance module
    await page.goto('/dashboard/finance');
    
    // Check for section heading or widget title
    // Using generic text search for resilience
    const widgetTitle = page.locator('text=Döviz Kurları').or(page.locator('text=Exchange Rates'));
    await expect(widgetTitle).toBeVisible({ timeout: 10000 });

    // Check for USD and EUR presence
    await expect(page.locator('text=USD')).toBeVisible();
    await expect(page.locator('text=EUR')).toBeVisible();
  });

  test('Bank Accounts Integration should show data', async ({ page }) => {
    await page.goto('/dashboard/finance/accounts');
    
    // Check for bank logos or names
    const bankName = page.locator('text=İş Bankası').or(page.locator('text=IsBank'));
    await expect(bankName).toBeVisible({ timeout: 10000 });
  });
});

